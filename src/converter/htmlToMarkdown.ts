import type { ModeEnum } from '../schemas/deepwiki'
import { parseHTML } from 'linkedom'
import rehypeParse from 'rehype-parse'
import rehypeRemark from 'rehype-remark'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import remarkStringify from 'remark-stringify'
import { unified } from 'unified'
import { rehypeRewriteLinks } from '../lib/linkRewrite'
import { sanitizeSchema } from '../lib/sanitizeSchema'

export async function htmlToMarkdown(
  html: string,
  mode: typeof ModeEnum._type,
): Promise<string> {
  // Ensure a DOM is available for rehype-parse with LinkeDOM
  const previousDocument = globalThis.document
  try {
    const { document } = parseHTML('<!doctype html>')
    // @ts-expect-error – augment global in Node
    globalThis.document = document

    const file = await unified()
      .use(rehypeParse, { fragment: true })
      .use(rehypeSanitize, sanitizeSchema)
      .use(rehypeRewriteLinks, { mode })
      .use(rehypeRemark)
      .use(remarkGfm)
      .use(remarkStringify, { fences: true, bullet: '-', rule: '-' })
      .process(html)

    return String(file)
  }
  finally {
    if (previousDocument === undefined) {
      // Clean up if we introduced the global
      // @ts-expect-error – delete dynamic property
      delete globalThis.document
    }
    else {
      // Restore previous value
      // @ts-expect-error – assign back dynamic property
      globalThis.document = previousDocument
    }
  }
}