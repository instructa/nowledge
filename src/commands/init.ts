import fs from 'node:fs/promises'
import path from 'node:path'
import { defineCommand } from 'citty'
import { CONFIG } from '../constants'
import { VectorDB } from '../lib/storage'
import { commonArgs } from './_shared'

export default defineCommand({
  meta: {
    name: 'init',
    description: 'Initialize a new nowledge database in the current project',
  },

  args: {
    path: {
      ...commonArgs.db,
      description: 'Path to create the database file',
    },
    force: {
      type: 'boolean',
      description: 'Force reinitialization even if database already exists',
      default: false,
    },
  },

  async run({ args }) {
    const dbPath = args.path || CONFIG.dbFileName
    const absolutePath = path.resolve(process.cwd(), dbPath)

    try {
      // Check if database already exists
      try {
        await fs.access(absolutePath)
        if (!args.force) {
          console.log(`Database already exists at ${absolutePath}`)
          console.log('Use --force to reinitialize')
          return 0
        }
        // If force is true and the file exists, delete it
        await fs.unlink(absolutePath)
      }
      catch (error) {
        // File doesn't exist, which is fine
      }

      // Ensure directory exists
      await fs.mkdir(path.dirname(absolutePath), { recursive: true })

      // Create and initialize the database
      const db = new VectorDB(absolutePath)
      db.init()
      db.close()

      console.log(`Initialized nowledge database at ${absolutePath}`)
      return 0
    }
    catch (error) {
      console.error(`Failed to initialize database:`, error)
      return 1
    }
  },
})
