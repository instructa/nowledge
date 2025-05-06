import type { ArgDef } from 'citty'
import { CONFIG } from '../constants'

export const cwdArgs = {
  cwd: {
    type: 'string',
    description: 'Specify the working directory',
    valueHint: 'directory',
    default: '.',
  },
} as const satisfies Record<string, ArgDef>

export const logLevelArgs = {
  logLevel: {
    type: 'string',
    description: 'Specify build-time log level',
    valueHint: 'silent|info|verbose',
  },
} as const satisfies Record<string, ArgDef>

export const envNameArgs = {
  envName: {
    type: 'string',
    description: 'The environment to use when resolving configuration overrides (default is `production` when building, and `development` when running the dev server)',
  },
} as const satisfies Record<string, ArgDef>

export const legacyRootDirArgs = {
  cwd: {
    ...cwdArgs.cwd,
    description: 'Specify the working directory, this takes precedence over ROOTDIR (default: `.`)',
    default: undefined,
  },
  rootDir: {
    type: 'positional',
    description: 'Specifies the working directory (default: `.`)',
    required: false,
    default: '.',
  },
} as const satisfies Record<string, ArgDef>

// Unified common args
export const commonArgs = {
  ...cwdArgs,
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
} as const satisfies Record<string, ArgDef>

export const sourceArgs = {
  source: {
    type: 'positional',
    description: 'Source directory or file pattern',
    required: true,
  },
  ...commonArgs,
} as const satisfies Record<string, ArgDef>

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
} as const satisfies Record<string, ArgDef>
