import fs from 'node:fs'
import path from 'node:path'
import { defineCommand } from 'citty'
import { globSync } from 'glob'
import { CONFIG } from '../constants'
import { splitMarkdown } from '../lib/chunker'
import { extractor } from '../lib/embedder'
import { VectorDB } from '../lib/storage'

export default defineCommand({
  meta: {
    name: 'ingest',
    description: 'Ingest markdown files into the knowledge database',
  },

  args: {
    source: {
      type: 'positional',
      description: 'Source directory or file pattern to ingest',
      required: true,
    },
    db: {
      type: 'string',
      description: 'Path to the database file',
      default: CONFIG.dbFileName,
    },
    clean: {
      type: 'boolean',
      description: 'Clean existing entries for files being ingested',
      default: true,
    },
    verbose: {
      type: 'boolean',
      description: 'Enable verbose output',
      default: false,
    },
  },

  async run({ args }) {
    const dbPath = args.db || CONFIG.dbFileName
    const source = args.source as string
    const verbose = args.verbose as boolean
    const clean = args.clean as boolean

    try {
      // Initialize the embedder (model loading)
      await extractor.ready()

      // Open the database
      const db = new VectorDB(dbPath)
      db.init()

      // Find files to ingest
      const filePaths = globSync(source, { absolute: true })

      if (filePaths.length === 0) {
        console.error(`No files found matching pattern: ${source}`)
        return 1
      }

      console.log(`Found ${filePaths.length} files to process...`)
      const startTime = Date.now()

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

      // Close the database
      db.close()

      const duration = (Date.now() - startTime) / 1000
      console.log(`Ingestion complete! Processed ${filePaths.length} files in ${duration.toFixed(2)}s`)
      return 0
    }
    catch (error) {
      console.error(`Error during ingestion: ${error}`)
      return 1
    }
  },
})
