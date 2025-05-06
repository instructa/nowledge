import { Client } from 'rqlite-client'

export interface RqliteOptions {
  url: string
}

/**
 * Async database wrapper that mirrors VectorDB but issues SQL over rqlite HTTP.
 */
export class RqliteDB {
  private client: Client
  constructor(url: string) {
    this.client = new Client([url])
  }

  /** Idempotent schema creation */
  async init(): Promise<void> {
    await this.client.execute(`
      BEGIN;
      CREATE TABLE IF NOT EXISTS chunk (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        file_path TEXT NOT NULL,
        embed TEXT NOT NULL          -- store embedding as JSON
      );
      CREATE VIRTUAL TABLE IF NOT EXISTS chunk_index USING vec(embed(384));
      CREATE TRIGGER IF NOT EXISTS chunk_insert AFTER INSERT ON chunk
        BEGIN
          INSERT INTO chunk_index(rowid, embed) VALUES (new.id, new.embed);
        END;
      CREATE TRIGGER IF NOT EXISTS chunk_delete AFTER DELETE ON chunk
        BEGIN
          DELETE FROM chunk_index WHERE rowid = old.id;
        END;
      COMMIT;
    `)
  }

  async insertChunk(chunk: { content: string; filePath: string; embedding: Float32Array }): Promise<number> {
    const embedJson = JSON.stringify(Array.from(chunk.embedding))
    const res = await this.client.execute(
      'INSERT INTO chunk (content, file_path, embed) VALUES (?, ?, ?)',
      [chunk.content, chunk.filePath, embedJson],
    )
    // rqlite returns an array of results; last_insert_id is in res[0].last_insert_id
    return res?.[0]?.last_insert_id ?? 0
  }

  async deleteChunksByFilePath(filePath: string): Promise<void> {
    await this.client.execute('DELETE FROM chunk WHERE file_path = ?', [filePath])
  }

  async querySimilar(queryVector: Float32Array, limit: number): Promise<Array<{ content: string; filePath: string; distance: number }>> {
    const vectorJson = JSON.stringify(Array.from(queryVector))
    const res = await this.client.query(
      `SELECT content, file_path, l2_distance(embed, ?) AS distance
       FROM chunk
       ORDER BY distance ASC
       LIMIT ?`,
      [vectorJson, limit],
    )
    return res?.[0]?.values?.map((row: any) => ({
      content: row[0],
      filePath: row[1],
      distance: row[2],
    })) ?? []
  }

  async vacuum(): Promise<void> {
    await this.client.execute('VACUUM')
  }

  async close(): Promise<void> {
    /* nothing to close for HTTP client */
  }
}