import { execSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cliPath = join(__dirname, '../dist/index.mjs')

describe('cLI Smoke Tests', () => {
  it('should display error when run without arguments', () => {
    try {
      execSync(`node ${cliPath}`, { encoding: 'utf-8', stdio: 'pipe' })
      expect.fail('Should have thrown an error')
    }
    catch (error: any) {
      expect(error.stderr).toContain('No command specified')
    }
  })

  it('should show crawl command stub output', () => {
    const output = execSync(`node ${cliPath} crawl https://example.com`, { encoding: 'utf-8' })
    expect(output).toContain('Crawl command - Not implemented yet')
    expect(output).toContain('URL: https://example.com')
  })

  it('should show init command stub output', () => {
    const output = execSync(`node ${cliPath} init myproject`, { encoding: 'utf-8' })
    expect(output).toContain('Init command - Not implemented yet')
    expect(output).toContain('Project name: myproject')
  })
})
