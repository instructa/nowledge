import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { CONFIG, SQLITE_VEC_EXTENSION } from '../constants'

export interface Chunk {
  id?: number
  content: string
  filePath: string
  embedding: Float32Array
}

export class VectorDB {
  private db: Database.Database
  private initialized: boolean = false
  private insertStmt: Database.Statement | null = null
  private deleteByPathStmt: Database.Statement | null = null
  private querySimilarStmt: Database.Statement | null = null

  constructor(dbPath: string = CONFIG.dbFileName) {
    // Ensure the database directory exists
    const dbDir = path.dirname(dbPath)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    // Initialize the database
    this.db = new Database(dbPath)

    // Resolve and validate the sqlite-vec extension path
    const resolvedExtPath = path.isAbsolute(SQLITE_VEC_EXTENSION)
      ? SQLITE_VEC_EXTENSION
      : path.resolve(process.cwd(), SQLITE_VEC_EXTENSION)

    const nativeDir = path.resolve(process.cwd(), 'native')
    if (!resolvedExtPath.startsWith(nativeDir + path.sep)) {
      throw new Error(
        `Refusing to load sqlite-vec extension from outside the native directory: ${resolvedExtPath}`,
      )
    }
    if (!fs.existsSync(resolvedExtPath)) {
      throw new Error(
        `sqlite-vec extension not found at ${resolvedExtPath}. Did you run "pnpm run setup-sqlite-vec"?`,
      )
    }

    // Load the validated extension
    try {
      this.db.loadExtension(resolvedExtPath)
    }
    catch (error) {
      throw new Error(
        `Failed to load sqlite-vec extension at ${resolvedExtPath}: ${error}`,
      )
    }
  }

  /**
   * Initialize the database schema
   */
  public init(): void {
    if (this.initialized)
      return

    // Create the chunks table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chunk (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        file_path TEXT NOT NULL,
        embed BLOB NOT NULL
      );
    `)

    // Create the index for vector search
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS chunk_index USING vec(
        embed(384)
      );
    `)

    // Create a trigger to keep the index in sync with the chunks table
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS chunk_insert AFTER INSERT ON chunk
      BEGIN
        INSERT INTO chunk_index(rowid, embed) VALUES (new.id, new.embed);
      END;
    `)

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS chunk_delete AFTER DELETE ON chunk
      BEGIN
        DELETE FROM chunk_index WHERE rowid = old.id;
      END;
    `)

    // Prepare statements for better performance
    this.insertStmt = this.db.prepare(`
      INSERT INTO chunk (content, file_path, embed)
      VALUES (?, ?, ?);
    `)

    this.deleteByPathStmt = this.db.prepare(`
      DELETE FROM chunk WHERE file_path = ?;
    `)

    this.querySimilarStmt = this.db.prepare(`
      SELECT c.content, c.file_path, l2_distance(c.embed, ?) as distance
      FROM chunk c
      ORDER BY distance ASC
      LIMIT ?;
    `)

    this.initialized = true
  }

  /**
   * Insert a chunk with content, file path, and embedding vector
   */
  public async insertChunk(chunk: Chunk): Promise<number> {
    if (!this.insertStmt) {
      throw new Error('Database not initialized. Call init() first.')
    }

    const result = this.insertStmt.run(
      chunk.content,
      chunk.filePath,
      Buffer.from(new Uint8Array(chunk.embedding.buffer)),
    )

    return result.lastInsertRowid as number
  }

  /**
   * Delete all chunks for a given file path
   */
  public async deleteChunksByFilePath(filePath: string): Promise<void> {
    if (!this.deleteByPathStmt) {
      throw new Error('Database not initialized. Call init() first.')
    }

    this.deleteByPathStmt.run(filePath)
  }

  /**
   * Query chunks by vector similarity
   */
  public async querySimilar(
    queryVector: Float32Array,
    limit: number = CONFIG.maxResults,
  ): Promise<Array<{ content: string, filePath: string, distance: number }>> {
    if (!this.querySimilarStmt) {
      throw new Error('Database not initialized. Call init() first.')
    }

    const results = this.querySimilarStmt.all(
      Buffer.from(new Uint8Array(queryVector.buffer)),
      limit,
    )

    return results.map((row: any) => ({
      content: row.content,
      filePath: row.file_path,
      distance: row.distance,
    }))
  }

  /**
   * Optimize the database
   */
  public async vacuum(): Promise<void> {
    this.db.exec('VACUUM;')
  }

  /**
   * Close the database connection
   */
  public async close(): Promise<void> {
    this.db.close()
  }
}