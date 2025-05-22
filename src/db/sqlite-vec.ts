import type { Buffer } from 'node:buffer'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface DocRecord {
  id: string
  path: string
  body: string
  summary: string
}

export interface VectorRecord {
  id: string
  embedding: Buffer
}

export class VectorDB {
  private db: Database.Database

  constructor(dbPath: string = 'docs.db') {
    this.db = new Database(dbPath)

    // Enable sqlite-vec extension
    try {
      // Find the extension file - try different locations and platforms
      const possiblePaths = [
        join(process.cwd(), 'lib', 'vec0.dylib'), // macOS
        join(process.cwd(), 'lib', 'vec0.so'), // Linux
        join(__dirname, '..', '..', 'lib', 'vec0.dylib'), // macOS (from dist)
        join(__dirname, '..', '..', 'lib', 'vec0.so'), // Linux (from dist)
      ]

      let extensionLoaded = false
      for (const path of possiblePaths) {
        if (existsSync(path)) {
          this.db.loadExtension(path)
          extensionLoaded = true
          break
        }
      }

      if (!extensionLoaded) {
        throw new Error('sqlite-vec extension not found in any expected location')
      }
    }
    catch (err) {
      console.warn('sqlite-vec extension not loaded, vector search disabled:', err)
    }

    this.initSchema()
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS docs(
        id TEXT PRIMARY KEY,
        path TEXT,
        body TEXT,
        summary TEXT
      );
      
      CREATE VIRTUAL TABLE IF NOT EXISTS vec USING vec0(
        id TEXT,
        embedding float[128]
      );
      
      CREATE INDEX IF NOT EXISTS idx_docs_path ON docs(path);
    `)
  }

  insertDoc(doc: DocRecord, embedding: Float32Array) {
    const insertDoc = this.db.prepare(
      'INSERT OR REPLACE INTO docs (id, path, body, summary) VALUES (?, ?, ?, ?)',
    )
    const insertVec = this.db.prepare(
      'INSERT OR REPLACE INTO vec (id, embedding) VALUES (?, ?)',
    )

    this.db.transaction(() => {
      insertDoc.run(doc.id, doc.path, doc.body, doc.summary)
      // Convert Float32Array to JSON string for sqlite-vec
      const embeddingJson = JSON.stringify(Array.from(embedding))
      insertVec.run(doc.id, embeddingJson)
    })()
  }

  search(queryEmbedding: Float32Array, k: number = 5): Array<{ path: string, summary: string, distance: number }> {
    const stmt = this.db.prepare(`
      SELECT docs.path, docs.summary, distance
      FROM vec
      JOIN docs ON vec.id = docs.id
      WHERE embedding match ?
        AND k = ?
      ORDER BY distance
    `)

    // Convert Float32Array to JSON string for sqlite-vec
    const embeddingJson = JSON.stringify(Array.from(queryEmbedding))
    return stmt.all(embeddingJson, k) as any
  }

  getDoc(path: string): DocRecord | null {
    const stmt = this.db.prepare('SELECT * FROM docs WHERE path = ?')
    return stmt.get(path) as DocRecord | null
  }

  close() {
    this.db.close()
  }
}
