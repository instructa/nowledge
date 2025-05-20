import type { z } from "zod";
import type {
  ErrorEnvelope,
  FetchSuccess,
  TProgressEvent,
} from "../schemas/nowledge";
import type { McpToolContext } from "../types";
import { htmlToMarkdown } from "../converter/htmlToMarkdown";
import { resolveRepo } from "../utils/resolveRepoFetch";
import { extractKeyword } from "../utils/extractKeyword";
import { crawl } from "../lib/httpCrawler";
import { FetchRequest } from "../schemas/nowledge";

export function nowledgeTool({ mcp }: McpToolContext) {
  mcp.tool(
    "nowledge_fetch",
    "Fetch a public web URL and return Markdown",
    FetchRequest.shape,
    async (input) => {
      // Normalize the URL to support short forms
      const normalizedInput = { ...input };
      if (typeof normalizedInput.url === "string") {
        let url = normalizedInput.url.trim();

        // If it's already an explicit HTTP(S) URL, use as-is
        if (/^https?:\/\//.test(url)) {
          // do nothing
        } else if (/^(?:[\w-]+\.)+[a-zA-Z]{2,}(?:\/.*)?$/.test(url)) {
          // Looks like a domain (e.g., example.com or www.example.com/path)
          url = `https://${url}`;
        } else if (/^[^/]+\/[^/]+$/.test(url)) {
          // owner/repo format, treat as GitHub repo
          url = `https://github.com/${url}`;
        } else if (/^[^/]+$/.test(url)) {
          // single word, try to resolve as GitHub repo
          if (url.includes(" ")) {
            const extracted = extractKeyword(url);
            if (extracted) {
              url = extracted;
            }
          }
          try {
            const repo = await resolveRepo(url); // "owner/repo"
            url = `https://github.com/${repo}`;
          } catch {
            // fallback: treat as a search term, but do not force a URL
            // Optionally, you could throw a validation error here
            // For now, just use as-is
            url = `https://github.com/defaultuser/${url}`;
          }
        } else {
          // Try to extract a library keyword from a free form phrase
          const extracted = extractKeyword(url);
          if (extracted) {
            // Resolve the extracted keyword
            try {
              const repo = await resolveRepo(extracted);
              url = `https://github.com/${repo}`;
            } catch {
              url = `https://github.com/defaultuser/${extracted}`;
            }
          }
        }

        normalizedInput.url = url;
      }
      const parse = FetchRequest.safeParse(normalizedInput);
      if (!parse.success) {
        const err: ErrorEnvelope = {
          status: "error",
          code: "VALIDATION",
          message: "Request failed schema validation",
          details: parse.error.flatten(),
        };
        return err;
      }

      const req = parse.data;
      const root = new URL(req.url);

      if (req.maxDepth > 1) {
        const err: z.infer<typeof ErrorEnvelope> = {
          status: "error",
          code: "VALIDATION",
          message: "maxDepth > 1 is not allowed",
        };
        return err;
      }

      // Nowledge: fetch from any public web URL (no domain restriction)

      // Progress emitter
      function emitProgress(e: any) {
        // Progress reporting is not supported in this context because McpServer does not have a sendEvent method.
      }

      const crawlResult = await crawl({
        root,
        maxDepth: req.maxDepth,
        emit: emitProgress,
        verbose: req.verbose,
      });

      // Convert each page
      const pages = await Promise.all(
        Object.entries(crawlResult.html).map(async ([path, html]) => ({
          path,
          markdown: await htmlToMarkdown(html, req.mode),
        }))
      );

      return {
        content: pages.map((page) => ({
          type: "text",
          text: `# ${page.path}\n\n${page.markdown}`,
        })),
      };
    }
  );
}
