import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { CONFIG } from '../src/constants'
import { extractor } from '../src/lib/embedder'
import { VectorDB } from '../src/lib/storage'

// Test directory for fixtures
const TEST_DIR = path.join(process.cwd(), 'test', 'fixtures')
const TEST_DB = path.join(TEST_DIR, '.test-nowledge.db')

// Create test fixtures
const FIXTURE_A = path.join(TEST_DIR, 'fileA.md')
const FIXTURE_A_CONTENT = `# File A
This is a test document about vector databases.
Vector databases are specialized database systems designed to store and query high-dimensional vectors.
They are commonly used in machine learning applications for similarity search.

## Features
- Efficient similarity search
- Support for various distance metrics
- Indexing methods for fast retrieval
- Integration with machine learning pipelines

Vector databases like Pinecone, Milvus, and Qdrant have become popular for production applications.
`

const FIXTURE_B = path.join(TEST_DIR, 'fileB.md')
const FIXTURE_B_CONTENT = `# File B
Transformer models have revolutionized natural language processing.
They use self-attention mechanisms to process input sequences in parallel.

## Applications
- Machine translation
- Text summarization
- Question answering
- Text generation

The original transformer paper "Attention is All You Need" was published by Google researchers in 2017.
`

const FIXTURE_C = path.join(TEST_DIR, 'fileC.md')
const FIXTURE_C_CONTENT = `# File C
SQLite is a C-language library that implements a small, fast, self-contained, high-reliability, full-featured, SQL database engine.
It's the most used database engine in the world, embedded in most major software applications.

## Advantages
- Zero configuration
- Serverless
- Single file storage
- Cross-platform
- Public domain

SQLite is not directly comparable to client/server SQL database engines like MySQL, Oracle, or PostgreSQL.
`

describe('nowledge CLI', () => {
  // Setup test environment
  beforeAll(async () => {
    // Create test directory
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true })
    }

    // Create test fixtures
    fs.writeFileSync(FIXTURE_A, FIXTURE_A_CONTENT)
    fs.writeFileSync(FIXTURE_B, FIXTURE_B_CONTENT)
    fs.writeFileSync(FIXTURE_C, FIXTURE_C_CONTENT)

    // Initialize model
    await extractor.ready()
  })

  // Clean up test environment
  afterAll(() => {
    // Remove test fixtures
    fs.unlinkSync(FIXTURE_A)
    fs.unlinkSync(FIXTURE_B)
    fs.unlinkSync(FIXTURE_C)

    // Remove test database
    if (fs.existsSync(TEST_DB)) {
      fs.unlinkSync(TEST_DB)
    }
  })

  it('should initialize a database', () => {
    if (fs.existsSync(TEST_DB)) {
      fs.unlinkSync(TEST_DB)
    }

    const db = new VectorDB(TEST_DB)
    db.init()
    db.close()

    expect(fs.existsSync(TEST_DB)).toBe(true)
  })

  it('should ingest markdown files and query them', async () => {
    // Initialize DB
    const db = new VectorDB(TEST_DB)
    db.init()

    // Process fixture A
    const embeddingA = await extractor.embed(FIXTURE_A_CONTENT)
    db.insertChunk({
      content: FIXTURE_A_CONTENT,
      filePath: 'fileA.md',
      embedding: embeddingA,
    })

    // Process fixture B
    const embeddingB = await extractor.embed(FIXTURE_B_CONTENT)
    db.insertChunk({
      content: FIXTURE_B_CONTENT,
      filePath: 'fileB.md',
      embedding: embeddingB,
    })

    // Process fixture C
    const embeddingC = await extractor.embed(FIXTURE_C_CONTENT)
    db.insertChunk({
      content: FIXTURE_C_CONTENT,
      filePath: 'fileC.md',
      embedding: embeddingC,
    })

    // Query for vector databases
    const queryVec = await extractor.embed('How do vector databases work?')
    const results = db.querySimilar(queryVec, 3)

    // First result should be fileA (about vector databases)
    expect(results[0].filePath).toBe('fileA.md')

    // Query for transformers
    const queryTransformer = await extractor.embed('Tell me about transformer models in NLP')
    const transformerResults = db.querySimilar(queryTransformer, 3)

    // First result should be fileB (about transformers)
    expect(transformerResults[0].filePath).toBe('fileB.md')

    // Query for SQLite
    const querySqlite = await extractor.embed('What is SQLite used for?')
    const sqliteResults = db.querySimilar(querySqlite, 3)

    // First result should be fileC (about SQLite)
    expect(sqliteResults[0].filePath).toBe('fileC.md')

    // Close DB
    db.close()
  })
})
