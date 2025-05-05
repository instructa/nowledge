import fs from 'node:fs'
import path from 'node:path'

// Default configuration values
export const DEFAULT_CONFIG = {
  // Chunking settings
  chunkSize: 512, // Chunk size in tokens
  chunkOverlap: 128, // Overlap between chunks in tokens

  // Model settings
  // Default path relative to project root, assuming models dir exists there
  modelPath: path.join('models', 'bge-micro-v2'),

  // Database settings
  // Default filename, usually in the project root or execution dir
  dbFileName: '.nowledge.db',

  // Query settings
  maxResults: 5,

  // Summary settings
  summaryLength: 10, // Number of sentences
}

// Extension paths based on platform
// Assumes native directory is relative to cwd where the app is run
export const SQLITE_VEC_EXTENSION = process.platform === 'darwin'
  ? path.join('native', 'libsqlite_vec.dylib')
  : process.platform === 'win32'
    ? path.join('native', 'sqlite-vec.dll')
    : path.join('native', 'libsqlite_vec.so')

// Load configuration from file if it exists
export function loadConfig() {
  const configPath = path.join(process.cwd(), 'nowledge.config.json')
  let config = { ...DEFAULT_CONFIG } // Start with defaults

  if (fs.existsSync(configPath)) {
    try {
      const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      // Merge user config over defaults
      config = { ...config, ...userConfig }
    }
    catch (error) {
      console.warn(`Warning: Failed to parse nowledge.config.json:`, error)
    }
  }

  // Resolve critical paths relative to the current working directory (cwd)
  // This ensures that if paths are specified in config (relative or absolute),
  // they are correctly interpreted based on where the CLI is run.
  config.modelPath = path.resolve(process.cwd(), config.modelPath)
  // dbFileName is often intended to be relative to cwd, so resolve it.
  config.dbFileName = path.resolve(process.cwd(), config.dbFileName)

  return config
}

// Current configuration (merged defaults with user overrides)
export const CONFIG = loadConfig()