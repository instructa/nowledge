import fs from 'node:fs'
import path from 'node:path'
import { defineCommand } from 'citty'
import { globSync } from 'glob'
import { CONFIG } from '../constants'
import { splitMarkdown } from '../lib/chunker'
import { extractor } from '../lib/embedder'
import { withDatabase } from '../utils/dbHelpers'
import { sourceArgs } from './_shared'

export default defineCommand({
  meta: {
    name: 'ingest',
    description: 'Ingest markdown files into the knowledge database',
  },
  args: {
    ...sourceArgs,
    clean: {
      type: 'boolean',
      description: 'Clean existing entries for files being ingested',
      default: true,
    },
  },
  async run({ args }) {
    const dbPath = args.db || CONFIG.dbFileName
    const source = args.source as string
    const verbose = args.verbose as boolean
    const clean = args.clean as boolean

    // Find files to ingest
    const filePaths = globSync(source, { absolute: true })

    if (filePaths.length === 0) {
      console.error(`No files found matching pattern: ${source}`)
      return 1
    }

    console.log(`Found ${filePaths.length} files to process...`)
    const startTime = Date.now()

    const result = await withDatabase(dbPath, async (db) => {
      for (const [index, filePath] of filePaths.entries()) {
        // Skip non-markdown files
        if (!filePath.toLowerCase().endsWith('.md')) {
          if (verbose) {
            console.log(`Skipping non-markdown file: ${filePath}`)
          }
          continue
        }

        const relativePath = path.relative(process.cwd(), filePath)

        if (verbose || filePaths.length < 10) {
          console.log(`Processing ${index + 1}/${filePaths.length}: ${relativePath}`)
        }
        else if ((index + 1) % 10 === 0) {
          console.log(`Processed ${index + 1}/${filePaths.length} files...`)
        }

        // Read the markdown file
        const content = fs.readFileSync(filePath, 'utf-8')

        // Clean existing entries if requested
        if (clean) {
          db.deleteChunksByFilePath(relativePath)
        }

        // Split the content into chunks
        const chunks = splitMarkdown(content, extractor.tokenizer)

        // Process each chunk
        for (const chunk of chunks) {
          // Generate embedding
          const embedding = await extractor.embed(chunk)

          // Store in the database
          db.insertChunk({
            content: chunk,
            filePath: relativePath,
            embedding,
          })
        }
      }

      return filePaths.length
    })

    const duration = (Date.now() - startTime) / 1000

    if (result.exitCode === 0) {
      console.log(`Ingestion complete! Processed ${filePaths.length} files in ${duration.toFixed(2)}s`)
    }

    return result.exitCode
  },
})
