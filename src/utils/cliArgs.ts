import { CONFIG } from '../constants'

/**
 * Common CLI arguments used across multiple commands
 */
export const commonArgs = {
  db: {
    type: 'string',
    description: 'Path to the database file',
    default: CONFIG.dbFileName,
  },
  verbose: {
    type: 'boolean',
    description: 'Enable verbose output',
    default: false,
  },
}

/**
 * CLI arguments for commands that deal with source files
 */
export const sourceArgs = {
  source: {
    type: 'positional',
    description: 'Source directory or file pattern',
    required: true,
  },
  ...commonArgs,
}

/**
 * CLI arguments for query commands
 */
export const queryArgs = {
  query: {
    type: 'positional',
    description: 'The query text',
    required: true,
  },
  ...commonArgs,
  limit: {
    type: 'number',
    description: 'Maximum number of results to return',
    default: CONFIG.maxResults,
  },
}