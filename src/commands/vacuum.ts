import { defineCommand } from 'citty'
import { CONFIG } from '../constants'
import { VectorDB } from '../lib/storage'

export default defineCommand({
  meta: {
    name: 'vacuum',
    description: 'Optimize the knowledge database by removing unused space',
  },

  args: {
    db: {
      type: 'string',
      description: 'Path to the database file',
      default: CONFIG.dbFileName,
    },
  },

  async run({ args }) {
    const dbPath = args.db || CONFIG.dbFileName

    try {
      // Open the database
      const db = new VectorDB(dbPath)
      db.init()

      console.log('Optimizing database...')

      // Run vacuum to optimize the database
      db.vacuum()

      // Close the database
      db.close()

      console.log('Database optimization complete.')
      return 0
    }
    catch (error) {
      console.error(`Error during optimization: ${error}`)
      return 1
    }
  },
})
