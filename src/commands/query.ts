import { defineCommand } from 'citty'
import { CONFIG } from '../constants'
import { extractor } from '../lib/embedder'
import { VectorDB } from '../lib/storage'
import { summarizeResults } from '../lib/summariser'

export default defineCommand({
  meta: {
    name: 'query',
    description: 'Query the knowledge database',
  },

  args: {
    query: {
      type: 'positional',
      description: 'The query text',
      required: true,
    },
    db: {
      type: 'string',
      description: 'Path to the database file',
      default: CONFIG.dbFileName,
    },
    limit: {
      type: 'number',
      description: 'Maximum number of results to return',
      default: CONFIG.maxResults,
    },
    summary: {
      type: 'boolean',
      description: 'Generate a summary of results',
      default: false,
    },
    summaryLength: {
      type: 'number',
      description: 'Number of sentences in summary',
      default: CONFIG.summaryLength,
    },
    format: {
      type: 'string',
      description: 'Output format (markdown, json, simple)',
      default: 'markdown',
    },
  },

  async run({ args }) {
    const dbPath = args.db || CONFIG.dbFileName
    const query = args.query as string
    const limit = args.limit || CONFIG.maxResults
    const summary = args.summary as boolean
    const summaryLength = args.summaryLength || CONFIG.summaryLength
    const format = args.format as string

    try {
      // Initialize the embedder (model loading)
      await extractor.ready()

      // Open the database
      const db = new VectorDB(dbPath)
      db.init()

      // Generate embedding for the query
      const queryEmbedding = await extractor.embed(query)

      // Search for similar chunks
      const results = db.querySimilar(queryEmbedding, limit)

      // Close the database
      db.close()

      if (results.length === 0) {
        console.log('No results found.')
        return 0
      }

      // Handle different output formats
      if (format === 'json') {
        // JSON output
        const output = {
          query,
          results: results.map(r => ({
            content: r.content,
            filePath: r.filePath,
            distance: r.distance,
          })),
        }

        if (summary) {
          output.summary = summarizeResults(
            results.map(r => r.content),
            summaryLength,
          )
        }

        console.log(JSON.stringify(output, null, 2))
      }
      else if (format === 'simple') {
        // Simple text output
        for (const result of results) {
          console.log(`File: ${result.filePath} (distance: ${result.distance.toFixed(4)})`)
          console.log('-'.repeat(80))
          console.log(result.content)
          console.log('-'.repeat(80))
          console.log()
        }

        if (summary) {
          console.log('SUMMARY:')
          console.log('========')
          console.log(summarizeResults(results.map(r => r.content), summaryLength))
        }
      }
      else {
        // Markdown output (default)
        if (summary) {
          console.log('# Summary\n')
          console.log(summarizeResults(results.map(r => r.content), summaryLength))
          console.log('\n---\n')
        }

        console.log('# Results\n')
        for (const [i, result] of results.entries()) {
          console.log(`## Result ${i + 1}: ${result.filePath}\n`)
          console.log(result.content)
          console.log(`\n_Distance: ${result.distance.toFixed(4)}_\n`)

          if (i < results.length - 1) {
            console.log('---\n')
          }
        }
      }

      return 0
    }
    catch (error) {
      console.error(`Error during query: ${error}`)
      return 1
    }
  },
})
