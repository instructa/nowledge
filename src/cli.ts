#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runMain as _runMain, defineCommand } from 'citty'

import ingestCommand from './commands/ingest'
// Import commands
import initCommand from './commands/init'
import queryCommand from './commands/query'
import vacuumCommand from './commands/vacuum'
import watchCommand from './commands/watch'

// Helper to get __dirname in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Function to read package.json and get version
async function getPackageVersion(): Promise<string> {
  try {
    const packageJsonPath = path.resolve(__dirname, '../package.json')
    const packageJsonContent = await readFile(packageJsonPath, 'utf-8')
    const packageJson = JSON.parse(packageJsonContent)
    return packageJson.version || 'unknown'
  }
  catch (error) {
    console.error('Failed to read package.json version:', error)
    return 'unknown'
  }
}

// Define the main CLI command using an async IIFE to fetch version
async function main() {
  const version = await getPackageVersion()

  const cli = defineCommand({
    meta: {
      name: 'nowledge',
      version,
      description: 'Knowledge management CLI for markdown documentation',
    },

    subCommands: {
      init: initCommand,
      ingest: ingestCommand,
      watch: watchCommand,
      query: queryCommand,
      vacuum: vacuumCommand,
    },
  })

  // Function to run the main CLI logic
  const runCli = () => _runMain(cli)

  // Allow running directly
  // ESM equivalent for checking if the module is the main script
  if (process.argv[1] === fileURLToPath(import.meta.url)) {
    runCli()
  }

  // Export runMain for potential programmatic use
  return { runMain: runCli }
}

// Execute the async setup and export runMain
export const { runMain } = await main()
