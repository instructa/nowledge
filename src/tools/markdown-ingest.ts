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

const ListSchema = z.object({
  // No parameters needed for listing all documents
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

// MCP tool wrapper - simplified to match working pattern
export function markdownIngestTool({ mcp }: McpToolContext) {
  // Ingest markdown files
  mcp.tool(
    'markdown_ingest',
    'Ingest markdown files into vector database for semantic search',
    IngestSchema.shape,
    async (input) => {
      try {
        const { directory, pattern = '*.md' } = input

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
          content: [{
            type: 'text',
            text: `Successfully ingested ${ingested} markdown files from ${directory}. Files processed: ${mdFiles.join(', ')}`,
          }],
        }
      }
      catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error during ingestion: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
        }
      }
    },
  )

  // Search markdown content
  mcp.tool(
    'markdown_search',
    'Search ingested markdown files using semantic similarity',
    SearchSchema.shape,
    async (input) => {
      try {
        const { query, limit = 5 } = input

        // Generate query embedding
        const queryEmbedding = await embedder.embed(query)

        // Search database
        const results = db.search(queryEmbedding, limit)

        if (results.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No results found for query: "${query}"`,
            }],
          }
        }

        const formattedResults = results.map((r, i) =>
          `${i + 1}. **${r.path}** (similarity: ${(1 - r.distance).toFixed(3)})\n   ${r.summary}`,
        ).join('\n\n')

        return {
          content: [{
            type: 'text',
            text: `Search results for "${query}":\n\n${formattedResults}`,
          }],
        }
      }
      catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error during search: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
        }
      }
    },
  )

  // List all ingested documents
  mcp.tool(
    'markdown_list',
    'List all ingested markdown documents in the database',
    ListSchema.shape,
    async () => {
      try {
        const documents = db.listAllDocs()

        if (documents.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No documents have been ingested yet. Use markdown_ingest to add documents to the database.',
            }],
          }
        }

        const formattedDocs = documents.map((doc, i) =>
          `${i + 1}. **${doc.path}** (${doc.body_length} chars)\n   ${doc.summary.length > 200 ? `${doc.summary.substring(0, 200)}...` : doc.summary}`,
        ).join('\n\n')

        return {
          content: [{
            type: 'text',
            text: `Found ${documents.length} ingested documents:\n\n${formattedDocs}`,
          }],
        }
      }
      catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error listing documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
        }
      }
    },
  )
}
