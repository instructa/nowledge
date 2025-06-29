#!/usr/bin/env node

import { defineCommand, runMain } from 'citty'
import { version } from '../package.json'

const main = defineCommand({
  meta: {
    name: 'nowledge',
    version,
    description: 'Fetch any public web content and convert to LLM-readable markdown',
  },
  subCommands: {
    help: {
      meta: {
        description: 'Show help information',
      },
      run() {
        console.log(`
Nowledge v${version}
Fetch any public web content and convert to LLM-readable markdown

USAGE
  nowledge <command> [options]

COMMANDS
  help       Show this help message
  serve      Start the MCP server (stdio, http, or sse)
  fetch      Fetch a URL and convert to markdown (coming soon)
  
EXAMPLES
  # Show help
  nowledge help
  
  # Start MCP server with stdio (default)
  nowledge serve
  
  # Start MCP server with HTTP transport
  nowledge serve --http --port 3000
  
  # Start MCP server with SSE transport  
  nowledge serve --sse --port 3001

For more information, visit: https://github.com/instructa/nowledge
        `.trim())
      },
    },
    serve: {
      meta: {
        description: 'Start the MCP server',
      },
      args: {
        http: {
          type: 'boolean',
          description: 'Use HTTP transport',
        },
        sse: {
          type: 'boolean',
          description: 'Use SSE transport',
        },
        stdio: {
          type: 'boolean',
          description: 'Use stdio transport (default)',
        },
        port: {
          type: 'string',
          description: 'Port for http/sse (default 3000)',
          default: '3000',
        },
        endpoint: {
          type: 'string',
          description: 'HTTP endpoint (default /mcp)',
          default: '/mcp',
        },
      },
      async run() {
        const { runMain: runMcpServer } = await import('@nowledge/mcp')
        await runMcpServer()
      },
    },
  },
  // Default to help if no command specified
  run() {
    console.log(`
Nowledge v${version}
Fetch any public web content and convert to LLM-readable markdown

Use 'nowledge help' to see available commands
    `.trim())
  },
})

runMain(main)
