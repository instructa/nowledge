import { defineCommand } from 'citty'

export const scrapeCommand = defineCommand({
  meta: {
    name: 'scrape',
    description: 'Scrape a single page and convert to markdown',
  },
  args: {
    url: {
      type: 'positional',
      description: 'URL to scrape',
      required: true,
    },
    output: {
      type: 'string',
      description: 'Output file path',
      default: './output.md',
    },
    selector: {
      type: 'string',
      description: 'CSS selector to extract specific content',
    },
  },
  run({ args }) {
    console.log('Scrape command - Not implemented yet')
    console.log('URL:', args.url)
    console.log('Output:', args.output)
    if (args.selector) {
      console.log('Selector:', args.selector)
    }
  },
})