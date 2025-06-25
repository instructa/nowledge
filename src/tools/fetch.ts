import type { z } from 'zod'
import type {
  ErrorEnvelope,
  FetchSuccess,
  TProgressEvent,
} from '../schemas/fetch'
import type { McpToolContext } from '../types'
import { htmlToMarkdown } from '../converter/htmlToMarkdown'
import { crawl } from '../lib/httpCrawler'
import { FetchRequest } from '../schemas/fetch'
import { extractKeyword } from '../utils/extractKeyword'
import { resolveRepo } from '../utils/resolveRepoFetch'

// MCP tool wrapper - simplified to match working pattern
export function fetchTool({ mcp }: McpToolContext) {
  mcp.tool(
    'nowledge_fetch',
    'Fetch a web page and return Markdown content',
    FetchRequest.shape,
    async (input) => {
      try {
        // Normalize the URL to support short forms
        const normalizedInput = { ...input }
        if (typeof normalizedInput.url === 'string') {
          let url = normalizedInput.url.trim()

          // Only transform when it is not already an explicit HTTP(S) URL
          if (!/^https?:\/\//.test(url)) {
            // Try to extract a library keyword from a free form phrase
            const extracted = extractKeyword(url)
            if (extracted) {
              url = extracted
            }
            // Single keyword with no slash – try to resolve against GitHub
            if (/^[^/]+$/.test(url)) {
              try {
                const repo = await resolveRepo(url) // "owner/repo"
                url = `https://github.com/${repo}`
              }
              catch {
                // If resolution fails, treat as-is (user should provide full URL)
                return {
                  content: [{
                    type: 'text',
                    text: 'Error: Could not resolve repository. Please provide a complete URL (e.g., https://example.com/path)',
                  }],
                }
              }
            }
            // If still not a full URL after processing, user should provide explicit URL
            if (!/^https?:\/\//.test(url)) {
              return {
                content: [{
                  type: 'text',
                  text: 'Error: Please provide a complete URL (e.g., https://example.com/path)',
                }],
              }
            }
          }

          normalizedInput.url = url
        }

        const parse = FetchRequest.safeParse(normalizedInput)
        if (!parse.success) {
          return {
            content: [{
              type: 'text',
              text: `Validation error: ${JSON.stringify(parse.error.flatten())}`,
            }],
          }
        }

        const req = parse.data
        const root = new URL(req.url)

        if (req.maxDepth > 1) {
          return {
            content: [{
              type: 'text',
              text: 'Error: maxDepth > 1 is not allowed',
            }],
          }
        }

        // Progress emitter - simplified
        function emitProgress(_e: any) {
          // Progress reporting is not supported in MCP context
        }

        const crawlResult = await crawl({
          root,
          maxDepth: req.maxDepth,
          emit: emitProgress,
          verbose: req.verbose,
        })

        // Convert each page
        const pages = await Promise.all(
          Object.entries(crawlResult.html).map(async ([path, html]) => ({
            path,
            markdown: await htmlToMarkdown(html, req.mode),
          })),
        )

        // Return simple content format that MCP expects
        if (req.mode === 'pages') {
          // For pages mode, return each page separately
          return {
            content: pages.map(page => ({
              type: 'text',
              text: `# ${page.path}\n\n${page.markdown}`,
            })),
          }
        }
        else {
          // For aggregate mode, combine all content
          const combinedContent = pages.map(page => `# ${page.path}\n\n${page.markdown}`).join('\n\n---\n\n')
          return {
            content: [{
              type: 'text',
              text: combinedContent,
            }],
          }
        }
      }
      catch (error) {
        // Handle any unexpected errors
        return {
          content: [{
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
          }],
        }
      }
    },
  )
}
