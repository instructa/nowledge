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

// Core fetch logic that can be used by CLI or MCP
export async function fetchWebContent(input: z.infer<typeof FetchRequest>) {
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
          url = repo
        }
        catch {
          // Fallback to previous behaviour for backward compatibility
          url = `defaultuser/${url}` // TODO: replace defaultuser logic
        }
      }
      // At this point url should be "owner/repo"
      url = `https://deepwiki.com/${url}`
    }

    normalizedInput.url = url
  }
  const parse = FetchRequest.safeParse(normalizedInput)
  if (!parse.success) {
    const err: z.infer<typeof ErrorEnvelope> = {
      status: 'error',
      code: 'VALIDATION',
      message: 'Request failed schema validation',
      details: parse.error.flatten(),
    }
    return err
  }

  const req = parse.data
  const root = new URL(req.url)

  if (req.maxDepth > 1) {
    const err: z.infer<typeof ErrorEnvelope> = {
      status: 'error',
      code: 'VALIDATION',
      message: 'maxDepth > 1 is not allowed',
    }
    return err
  }

  if (root.hostname !== 'deepwiki.com') {
    const err: z.infer<typeof ErrorEnvelope> = {
      status: 'error',
      code: 'DOMAIN_NOT_ALLOWED',
      message: 'Only deepwiki.com domains are allowed',
    }
    return err
  }

  // Progress emitter
  function emitProgress(_e: any) {
    // Progress reporting is not supported in this context because McpServer does not have a sendEvent method.
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

  return {
    content: pages.map(page => ({
      type: 'text',
      text: `# ${page.path}\n\n${page.markdown}`,
    })),
  }
}

// MCP tool wrapper
export function fetchTool({ mcp }: McpToolContext) {
  mcp.tool(
    'nowledge_fetch',
    'Fetch a web page and return Markdown content',
    FetchRequest.shape,
    fetchWebContent,
  )
}
