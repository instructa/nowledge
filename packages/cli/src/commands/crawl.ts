import { defineCommand } from 'citty'

export const crawlCommand = defineCommand({
  meta: {
    name: 'crawl',
    description: 'Crawl a website and convert pages to markdown',
  },
  args: {
    url: {
      type: 'positional',
      description: 'URL to crawl',
      required: true,
    },
    depth: {
      type: 'string',
      description: 'Maximum crawl depth',
      default: '3',
    },
    output: {
      type: 'string',
      description: 'Output directory',
      default: './output',
    },
  },
  run({ args }) {
    console.log('Crawl command - Not implemented yet')
    console.log('URL:', args.url)
    console.log('Depth:', args.depth)
    console.log('Output:', args.output)
  },
})
