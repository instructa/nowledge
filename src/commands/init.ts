import fs from 'node:fs'
import path from 'node:path'
import { defineCommand } from 'citty'
import { CONFIG } from '../constants'
import { VectorDB } from '../lib/storage'

export default defineCommand({
  meta: {
    name: 'init',
    description: 'Initialize a new nowledge database in the current project',
  },

  args: {
    path: {
      type: 'string',
      description: 'Path to create the database file',
      default: CONFIG.dbFileName,
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

    // Check if database already exists
    if (fs.existsSync(absolutePath) && !args.force) {
      console.log(`Database already exists at ${absolutePath}`)
      console.log('Use --force to reinitialize')
      return 0
    }

    // If force is true and the file exists, delete it
    if (fs.existsSync(absolutePath) && args.force) {
      fs.unlinkSync(absolutePath)
    }

    try {
      // Create and initialize the database
      const db = new VectorDB(absolutePath)
      db.init()
      db.close()

      console.log(`Initialized nowledge database at ${absolutePath}`)
      return 0
    }
    catch (error) {
      console.error(`Failed to initialize database: ${error}`)
      return 1
    }
  },
})
