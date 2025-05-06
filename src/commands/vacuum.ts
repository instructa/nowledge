import { defineCommand } from 'citty'
import { withDatabase } from '../utils/dbHelpers'
import { commonArgs } from './_shared'

export default defineCommand({
  meta: {
    name: 'vacuum',
    description: 'Optimize the knowledge database by removing unused space',
  },

  args: {
    ...commonArgs,
  },

  async run({ args }) {
    const dbPath = args.db

    const result = await withDatabase(dbPath, async (db) => {
      console.log('Optimizing database...')
      await db.vacuum()
      return true
    })

    if (result.exitCode === 0) {
      console.log('Database optimization complete.')
    }

    return result.exitCode
  },
})