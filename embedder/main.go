package main

import (
	"bytes"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/samber/lo"
)

const (
	dim = 384 // bge-micro-v2 outputs 384-dim vectors
)

// --- load vocabulary ------------------------------------------------
var vocab = func() map[string]int {
	data, _ := os.ReadFile("/model/vocab.txt")
	v := make(map[string]int)
	for i, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line != "" {
			v[line] = i
		}
	}
	return v
}()

// --- load embedding table -------------------------------------------
var table = func() [][]float32 {
	f, _ := os.Open("/model/embedding.npy")
	defer f.Close()
	var header [80]byte // skip npy header
	f.Read(header[:])
	raw, _ := io.ReadAll(f)

	vecs := make([][]float32, len(vocab))
	reader := bytes.NewReader(raw)
	for i := range vecs {
		vecs[i] = make([]float32, dim)
		binary.Read(reader, binary.LittleEndian, &vecs[i])
	}
	return vecs
}()

// encode converts text → average static embedding
func encode(text string) [dim]float32 {
	var v [dim]float32
	for _, tok := range strings.Fields(strings.ToLower(text)) {
		if id, ok := vocab[tok]; ok {
			for i := 0; i < dim; i++ {
				v[i] += table[id][i]
			}
		}
	}
	return v
}

// --- helpers --------------------------------------------------------
func execSQL(stmts any) error {
	body, err := json.Marshal(gin.H{"statements": stmts})
	if err != nil {
		return fmt.Errorf("failed to marshal SQL statements: %w", err)
	}
	resp, err := http.Post(os.Getenv("RQLITE_URL")+"/db/execute", "application/json", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to execute SQL: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("rqlite request failed with status %s: %s", resp.Status, string(bodyBytes))
	}

	var rqliteResp struct {
		Results []struct {
			Error string `json:"error"`
		} `json:"results"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&rqliteResp); err != nil {
		return fmt.Errorf("failed to decode rqlite response: %w", err)
	}

	for _, res := range rqliteResp.Results {
		if res.Error != "" {
			return fmt.Errorf("rqlite execution error: %s", res.Error)
		}
	}
	return nil
}

func querySQL(q string) []any {
	res, _ := http.Get(os.Getenv("RQLITE_URL") + "/db/query?q=" + url.QueryEscape(q))
	defer res.Body.Close()
	var j struct {
		Results []struct {
			Values []any `json:"values"`
		} `json:"results"`
	}
	json.NewDecoder(res.Body).Decode(&j)
	if len(j.Results) == 0 {
		return nil
	}
	return j.Results[0].Values
}

func main() {
	// create vec table if it does not exist
	err := execSQL(`CREATE VIRTUAL TABLE IF NOT EXISTS vec USING vec0(id TEXT, chunk TEXT, embedding FLOAT[384]);`)
	if err != nil {
		panic(fmt.Sprintf("Failed to create vec table: %v", err))
	}

	g := gin.Default()

	// ---------- add URL ----------
	g.POST("/add", func(c *gin.Context) {
		var in struct{ URL string `json:"url"` }
		if err := c.BindJSON(&in); err != nil {
			c.String(http.StatusBadRequest, "invalid request: %v", err)
			return
		}

		// crawl
		reqBody := fmt.Sprintf("{\"url\":\"%s\",\"depth\":2}", in.URL)
		resp, err := http.Post(os.Getenv("CRAWL_API")+"/crawl", "application/json", strings.NewReader(reqBody))
		if err != nil {
			c.String(http.StatusBadGateway, "crawler error: %v", err)
			return
		}
		defer resp.Body.Close()
		var crawl struct {
			Pages []struct {
				URL      string `json:"url"`
				Markdown string `json:"markdown"`
			} `json:"pages"`
		}
		json.NewDecoder(resp.Body).Decode(&crawl)

		var insertErrors []string
		for _, p := range crawl.Pages {
			words := strings.Fields(p.Markdown)
			for i := 0; i < len(words); i += 200 {
				end := lo.Min([]int{i + 200, len(words)})
				chunk := strings.Join(words[i:end], " ")
				vec := encode(chunk)
				vecJSON, _ := json.Marshal(vec)

				stmt := gin.H{
					"sql":        "INSERT INTO vec (id, chunk, embedding) VALUES (?,?,?)",
					"parameters": []any{p.URL, chunk, string(vecJSON)},
				}
				if err := execSQL([]any{stmt}); err != nil {
					errMsg := fmt.Sprintf("failed to insert chunk for URL %s: %v", p.URL, err)
					log.Printf("ERROR: %s", errMsg) // Force log output
					c.Error(fmt.Errorf(errMsg))      // Gin standard error logging
					insertErrors = append(insertErrors, errMsg)
				}
			}
		}

		if len(insertErrors) > 0 {
			c.JSON(http.StatusInternalServerError, gin.H{
				"message": "Errors occurred during indexing",
				"errors":  insertErrors,
				"indexed": len(crawl.Pages) - len(insertErrors), // Approximation
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{"indexed": len(crawl.Pages)})
	})

	// ---------- search ----------
	g.GET("/search", func(c *gin.Context) {
		q := c.Query("q")
		if q == "" {
			c.String(http.StatusBadRequest, "missing ?q param")
			return
		}
		vec := encode(q)
		vecJSON, _ := json.Marshal(vec)
		sql := "SELECT id, chunk, distance(*) d FROM vec WHERE embedding MATCH '" + string(vecJSON) + "' ORDER BY d LIMIT 5;"
		c.JSON(http.StatusOK, gin.H{"hits": querySQL(sql)})
	})

	g.Run(":9000")
}