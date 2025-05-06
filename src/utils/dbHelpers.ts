import { CONFIG } from '../constants'
import { extractor } from '../lib/embedder'
import { VectorDB } from '../lib/storage'
import { RqliteDB } from '../lib/rqliteDB'

/**
 * Interface for the result of a database operation
 */
export interface DbOperationResult<T> {
  result: T
  exitCode: number
}

/**
 * Run a function with an initialized database connection
 *
 * @param dbPath Path to the database file
 * @param operation The operation to run with the database
 * @returns The result of the operation and an exit code
 */
export async function withDatabase<T>(
  dbPath: string,
  operation: (db: VectorDB) => Promise<T>
): Promise<DbOperationResult<T>> {
  try {
    // Initialize the embedder (model loading)
    await extractor.ready()

    // Decide backend
    const db = process.env.RQLITE_URL
      ? new RqliteDB(process.env.RQLITE_URL)
      : new VectorDB(dbPath)
    await db.init?.()    // both backends expose async init

    try {
      // Run the operation
      const result = await operation(db)
      
      // Close the database
      await db.close()
      
      return { result, exitCode: 0 }
    } catch (error) {
      // Close the database even if the operation fails
      db.close()
      throw error
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Database operation error:`, error)
    return { result: null as unknown as T, exitCode: 1 }
  }
}