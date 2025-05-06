import type { McpToolContext } from '@/types'
import process from 'node:process'
import { deepwikiTool } from '@/tools/deepwiki'
import { getPackageJson } from '@/utils'
import { createServer, startServer, stopServer } from '@/utils/server'
import { defineCommand } from 'citty'
// import { logger } from '../utils/logger'
import { cwdArgs, logLevelArgs } from './_shared'

export default defineCommand({
  meta: {
    name: 'server',
    description: 'Start the MCP server process',
  },
  args: {
    ...cwdArgs,
    ...logLevelArgs,
    http: { type: 'boolean', description: 'Run with HTTP transport' },
    sse: { type: 'boolean', description: 'Run with SSE transport' },
    stdio: { type: 'boolean', description: 'Run with stdio transport (default)' },
    port: { type: 'string', description: 'Port for http/sse (default 3000)', default: '3000' },
    endpoint: { type: 'string', description: 'HTTP endpoint (default /mcp)', default: '/mcp' },
  },
  async run({ args }) {
    const mode = args.http ? 'http' : args.sse ? 'sse' : 'stdio'
    const pkg = getPackageJson()
    const version = pkg?.version || '0.0.0'
    const mcp = createServer({ name: 'my-mcp-server', version })

    process.on('SIGTERM', () => stopServer(mcp))
    process.on('SIGINT', () => stopServer(mcp))

    deepwikiTool({ mcp } as McpToolContext)

    if (mode === 'http') {
      await startServer(mcp, { type: 'http', port: Number(args.port), endpoint: args.endpoint })
    }
    else if (mode === 'sse') {
      await startServer(mcp, { type: 'sse', port: Number(args.port) })
    }
    else if (mode === 'stdio') {
      await startServer(mcp, { type: 'stdio' })
    }
  },
})
