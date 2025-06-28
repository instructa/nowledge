#!/usr/bin/env node

import { defineCommand, runMain } from 'citty'

// Import commands
import { crawlCommand } from './commands/crawl'
import { scrapeCommand } from './commands/scrape'
import { screenshotCommand } from './commands/screenshot'
import { fetchCommand } from './commands/fetch'
import { initCommand } from './commands/init'

const main = defineCommand({
  meta: {
    name: 'nowledge',
    version: '0.0.1',
    description: 'CLI for nowledge - fetch any public web content and turn it into LLM readable markdown',
  },
  subCommands: {
    crawl: crawlCommand,
    scrape: scrapeCommand,
    screenshot: screenshotCommand,
    fetch: fetchCommand,
    init: initCommand,
  },
})

runMain(main)