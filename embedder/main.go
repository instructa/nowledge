package main

import (
	"bytes"
	"encoding/binary"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/samber/lo"
)

const (
	dim = 256
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
func execSQL(stmts any) {
	body, _ := json.Marshal(gin.H{"statements": stmts})
	http.Post(os.Getenv("RQLITE_URL")+"/db/execute", "application/json", bytes.NewReader(body))
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
	execSQL(`CREATE VIRTUAL TABLE IF NOT EXISTS vec USING vec0(id TEXT, chunk TEXT, embedding FLOAT[256]);`)

	g := gin.Default()

	// ---------- add URL ----------
	g.POST("/add", func(c *gin.Context) {
		var in struct{ URL string `+"`json:\"url\"`"+` }
		if err := c.BindJSON(&in); err != nil {
			c.String(http.StatusBadRequest, "invalid request: %v", err)
			return
		}

		// crawl
		reqBody := ` + "`" + `{"url":"` + "`" + ` + in.URL + ` + "`" + `","depth":2}` + "`" + `
		resp, err := http.Post(os.Getenv("CRAWL_API")+"/crawl", "application/json", strings.NewReader(reqBody))
		if err != nil {
			c.String(http.StatusBadGateway, "crawler error: %v", err)
			return
		}
		defer resp.Body.Close()
		var crawl struct {
			Pages []struct {
				URL      string `+"`json:\"url\"`"+`
				Markdown string `+"`json:\"markdown\"`"+`
			} `+"`json:\"pages\"`"+`
		}
		json.NewDecoder(resp.Body).Decode(&crawl)

		for _, p := range crawl.Pages {
			words := strings.Fields(p.Markdown)
			for i := 0; i < len(words); i += 200 {
				end := lo.Min(i+200, len(words))
				chunk := strings.Join(words[i:end], " ")
				vec := encode(chunk)
				vecJSON, _ := json.Marshal(vec)

				stmt := gin.H{
					"sql":        "INSERT INTO vec (id, chunk, embedding) VALUES (?,?,?)",
					"parameters": []any{p.URL, chunk, string(vecJSON)},
				}
				execSQL([]any{stmt})
			}
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