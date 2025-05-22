import type { McpToolContext } from '../types'
import { randomUUID } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { z } from 'zod'
import { VectorDB } from '../db/sqlite-vec'
import { extractiveSummary, NomicEmbeddings } from '../embeddings/nomic'

const IngestSchema = z.object({
  directory: z.string().describe('Directory containing markdown files to ingest'),
  pattern: z.string().optional().default('*.md').describe('File pattern to match'),
})

const SearchSchema = z.object({
  query: z.string().describe('Search query'),
  limit: z.number().optional().default(5).describe('Maximum results to return'),
})

// Simple sentence splitter
function splitSentences(text: string): string[] {
  // Basic splitting on sentence boundaries
  const sentences = text.match(/[^.!?]+[.!?]+/g) || []
  return sentences.map(s => s.trim()).filter(s => s.length > 0)
}

// Initialize database and embedder (can be reused)
const db = new VectorDB('docs.db')
const embedder = new NomicEmbeddings()

// Core ingest logic that can be used by CLI or MCP
export async function ingestMarkdownFiles({ directory, pattern = '*.md' }: z.infer<typeof IngestSchema>) {
  try {
    const files = await readdir(directory)
    const mdFiles = files.filter((f) => {
      if (pattern === '*.md') {
        return extname(f) === '.md'
      }
      return f.match(new RegExp(pattern.replace('*', '.*')))
    })

    let ingested = 0

    for (const file of mdFiles) {
      const path = join(directory, file)
      const content = await readFile(path, 'utf-8')

      // Generate embedding for full document
      const docEmbedding = await embedder.embed(content)

      // Generate extractive summary
      const sentences = splitSentences(content)
      let summary = content

      if (sentences.length > 3) {
        const sentEmbeddings = await embedder.embedBatch(sentences)
        summary = extractiveSummary(sentences, sentEmbeddings, 3)
      }

      // Store in database
      db.insertDoc(
        {
          id: randomUUID(),
          path,
          body: content,
          summary,
        },
        docEmbedding,
      )

      ingested++
    }

    return {
      success: true,
      message: `Ingested ${ingested} markdown files from ${directory}`,
      files: mdFiles,
    }
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Core search logic that can be used by CLI or MCP
export async function searchMarkdownContent({ query, limit = 5 }: z.infer<typeof SearchSchema>) {
  try {
    // Generate query embedding
    const queryEmbedding = await embedder.embed(query)

    // Search database
    const results = db.search(queryEmbedding, limit)

    return {
      success: true,
      query,
      results: results.map(r => ({
        path: r.path,
        summary: r.summary,
        similarity: 1 - r.distance, // Convert distance to similarity
      })),
    }
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// MCP tool wrapper
export function markdownIngestTool({ mcp }: McpToolContext) {
  // Ingest markdown files
  mcp.tool(
    'markdown_ingest',
    'Ingest markdown files into vector database for semantic search',
    IngestSchema.shape,
    ingestMarkdownFiles,
  )

  // Search markdown content
  mcp.tool(
    'markdown_search',
    'Search ingested markdown files using semantic similarity',
    SearchSchema.shape,
    searchMarkdownContent,
  )
}
