import fs from 'node:fs'
import path from 'node:path'
import chokidar from 'chokidar'
import { defineCommand } from 'citty'
import { CONFIG } from '../constants'
import { splitMarkdown } from '../lib/chunker'
import { extractor } from '../lib/embedder'
import { VectorDB } from '../lib/storage'
import { sourceArgs } from './_shared'

export default defineCommand({
  meta: {
    name: 'watch',
    description: 'Watch for changes in markdown files and update the knowledge database',
  },

  args: {
    ...sourceArgs,
  },

  async run({ args }) {
    const dbPath = args.db || CONFIG.dbFileName
    const source = args.source as string
    const verbose = args.verbose as boolean

    try {
      // Initialize the embedder (model loading)
      await extractor.ready()
      console.log('Embedding model loaded.')

      // Open the database
      const db = new VectorDB(dbPath)
      db.init()
      console.log('Database initialized.')

      console.log(`Watching for changes in ${source}...`)
      console.log('Press Ctrl+C to stop')

      // Set up the watcher
      const watcher = chokidar.watch(source, {
        ignored: /(^|[/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: false,
      })

      // Process file function
      const processFile = async (filePath: string) => {
        // Skip non-markdown files
        if (!filePath.toLowerCase().endsWith('.md')) {
          if (verbose) {
            console.log(`Skipping non-markdown file: ${filePath}`)
          }
          return
        }

        const relativePath = path.relative(process.cwd(), filePath)
        console.log(`Processing: ${relativePath}`)

        try {
          // Read the markdown file
          const content = fs.readFileSync(filePath, 'utf-8')

          // Clean existing entries
          await db.deleteChunksByFilePath(relativePath)

          // Split the content into chunks - now fixed in splitMarkdown
          const chunks = splitMarkdown(content, extractor.tokenizer)

          // Process each chunk
          for (const chunk of chunks) {
            // Generate embedding
            const embedding = await extractor.embed(chunk)

            // Store in the database
            await db.insertChunk({
              content: chunk,
              filePath: relativePath,
              embedding,
            })
          }

          console.log(`Indexed ${chunks.length} chunks from ${relativePath}`)
        }
        catch (error) {
          console.error(`Error processing ${relativePath}:`, error)
        }
      }

      // Remove file function
      const removeFile = (filePath: string) => {
        // Skip non-markdown files
        if (!filePath.toLowerCase().endsWith('.md')) {
          return
        }

        const relativePath = path.relative(process.cwd(), filePath)
        console.log(`Removing: ${relativePath}`)

        try {
          // Delete chunks for this file
          db.deleteChunksByFilePath(relativePath)
          console.log(`Removed chunks for ${relativePath}`)
        }
        catch (error) {
          console.error(`Error removing ${relativePath}:`, error)
        }
      }

      // Set up event handlers
      watcher
        .on('add', processFile)
        .on('change', processFile)
        .on('unlink', removeFile)

      // Handle SIGINT (Ctrl+C)
      process.on('SIGINT', () => {
        console.log('\nStopping watcher...')
        watcher.close()
        db.close()
        console.log('Database closed.')
        process.exit(0)
      })

      // This command runs until interrupted
      return new Promise<never>(() => {})
    }
    catch (error) {
      console.error(`Error during watch:`, error)
      return 1
    }
  },
})