package main

import (
	"net/http"

	markdown "github.com/JohannesKaufmann/html-to-markdown"
	"github.com/gin-gonic/gin"
	"github.com/gocolly/colly/v2"
)

type crawlRequest struct {
	URL   string `json:"url"`
	Depth int    `json:"depth"`
}

type page struct {
	URL      string `json:"url"`
	Markdown string `json:"markdown"`
}

func main() {
	r := gin.Default()
	r.POST("/crawl", func(c *gin.Context) {
		var req crawlRequest
		if err := c.BindJSON(&req); err != nil {
			c.String(http.StatusBadRequest, "invalid request: %v", err)
			return
		}
		if req.Depth == 0 {
			req.Depth = 2
		}

		converter := markdown.NewConverter("", true, nil)
		var pages []page

		cl := colly.NewCollector(colly.MaxDepth(req.Depth))
		cl.OnHTML("html", func(e *colly.HTMLElement) {
			htmlStr, htmlErr := e.DOM.Html()
			if htmlErr != nil {
				return
			}
			md, err := converter.ConvertString(htmlStr)
			if err != nil {
				return
			}
			pages = append(pages, page{
				URL:      e.Request.URL.String(),
				Markdown: md,
			})
		})
		cl.Visit(req.URL)
		cl.Wait()

		c.JSON(http.StatusOK, gin.H{"pages": pages})
	})
	r.Run(":8000")
}