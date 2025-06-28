import { describe, it, expect } from 'vitest'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const mcpPath = join(__dirname, '../dist/index.mjs')

describe('MCP Server Smoke Tests', () => {
  it('should display help when run with --help', (done) => {
    const proc = spawn('node', [mcpPath, '--help'])
    let output = ''
    
    proc.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    proc.on('close', (code) => {
      expect(code).toBe(0)
      expect(output).toContain('mcp-nowledge')
      expect(output).toContain('stdio')
      expect(output).toContain('http')
      expect(output).toContain('sse')
      done()
    })
  })

  it('should start stdio server and respond to initialization', (done) => {
    const proc = spawn('node', [mcpPath, '--stdio'])
    let initialized = false
    
    // Send MCP initialization request
    const initRequest = JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '0.1.0',
        capabilities: {}
      },
      id: 1
    }) + '\n'
    
    proc.stdout.on('data', (data) => {
      const response = data.toString()
      try {
        const parsed = JSON.parse(response.trim())
        if (parsed.id === 1 && parsed.result) {
          initialized = true
          proc.kill()
        }
      } catch (e) {
        // Ignore parse errors for partial data
      }
    })
    
    proc.on('spawn', () => {
      // Give the server a moment to start
      setTimeout(() => {
        proc.stdin.write(initRequest)
      }, 100)
    })
    
    proc.on('close', () => {
      expect(initialized).toBe(true)
      done()
    })
    
    // Timeout after 2 seconds
    setTimeout(() => {
      if (!initialized) {
        proc.kill()
        done(new Error('Server did not initialize in time'))
      }
    }, 2000)
  })
})