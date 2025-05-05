import fs from 'node:fs'
import path from 'node:path'
import { env, pipeline } from '@xenova/transformers'
import { Tokenizer } from 'tokenizers'
import { CONFIG } from '../constants'

// Set the cache directory for models
env.cacheDir = CONFIG.modelPath

// Singleton class for embeddings to avoid reloading the model multiple times
class Embedder {
  private static instance: Embedder
  private _pipeline: any
  private _tokenizer: Tokenizer
  private _isReady: boolean = false
  private _initPromise: Promise<void> | null = null

  private constructor() {
    this._initPromise = this.initialize()
  }

  /**
   * Initialize the embedding pipeline and tokenizer
   */
  private async initialize(): Promise<void> {
    try {
      // Initialize the embedding pipeline
      this._pipeline = await pipeline('feature-extraction', 'TaylorAI/bge-micro-v2')

      // Initialize the tokenizer - we'll use this for token counting
      const tokenizerJsonPath = path.join(CONFIG.modelPath, 'tokenizer.json')
      if (!fs.existsSync(tokenizerJsonPath)) {
        throw new Error(`Tokenizer file not found at ${tokenizerJsonPath}. Make sure the model is downloaded.`)
      }

      this._tokenizer = await Tokenizer.fromFile(tokenizerJsonPath)
      this._isReady = true
    }
    catch (error) {
      console.error('Failed to initialize embedding pipeline:', error)
      throw error
    }
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): Embedder {
    if (!Embedder.instance) {
      Embedder.instance = new Embedder()
    }
    return Embedder.instance
  }

  /**
   * Wait for the embedder to be ready
   */
  public async ready(): Promise<void> {
    if (!this._isReady && this._initPromise) {
      await this._initPromise
    }
  }

  /**
   * Get the tokenizer instance
   */
  public get tokenizer(): Tokenizer {
    if (!this._isReady) {
      throw new Error('Embedder is not ready. Call ready() first.')
    }
    return this._tokenizer
  }

  /**
   * Generate embeddings for a text
   * @param text The text to embed
   * @returns Float32Array containing the embedding
   */
  public async embed(text: string): Promise<Float32Array> {
    if (!this._isReady) {
      await this.ready()
    }

    const output = await this._pipeline(text, {
      pooling: 'mean',
      normalize: true,
    })

    // Extract the embedding
    return output.data
  }

  /**
   * Get token count for a text
   * @param text The text to count tokens for
   * @returns Number of tokens
   */
  public countTokens(text: string): number {
    if (!this._isReady) {
      throw new Error('Embedder is not ready. Call ready() first.')
    }

    return this._tokenizer.encode(text).ids.length
  }
}

// Export the singleton instance
export const extractor = Embedder.getInstance()
