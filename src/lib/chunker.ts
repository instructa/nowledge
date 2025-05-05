import type { Tokenizer } from 'tokenizers'
import MarkdownIt from 'markdown-it'
import { CONFIG } from '../constants'

// Create an instance of MarkdownIt parser
const md = new MarkdownIt('commonmark')

interface ChunkMeta {
  content: string
  startIndex: number
  endIndex: number
  tokenCount: number
}

/**
 * Split markdown content into chunks respecting code blocks and maintaining
 * context with overlapping tokens.
 *
 * @param content The markdown content to split
 * @param tokenizer The tokenizer to use for calculating token counts
 * @returns An array of content chunks
 */
export function splitMarkdown(content: string, tokenizer: Tokenizer): string[] {
  // Extract code blocks to avoid splitting them
  const codeBlocks: { start: number, end: number, content: string }[] = []
  const codeBlockRegex = /```[\s\S]*?```/g
  let match: RegExpExecArray | null

  while ((match = codeBlockRegex.exec(content)) !== null) {
    codeBlocks.push({
      start: match.index,
      end: match.index + match[0].length,
      content: match[0],
    })
  }

  // Check if a position is inside a code block
  const isInCodeBlock = (pos: number): boolean => {
    return codeBlocks.some(block => pos >= block.start && pos <= block.end)
  }

  // Split the content into paragraphs
  const paragraphs: ChunkMeta[] = []
  const lines = content.split('\n')
  let currentParagraph = ''
  let startIndex = 0

  for (const line of lines) {
    if (line.trim() === '') {
      if (currentParagraph.trim() !== '') {
        const tokenCount = tokenizer.encode(currentParagraph).ids.length
        paragraphs.push({
          content: currentParagraph,
          startIndex,
          endIndex: startIndex + currentParagraph.length,
          tokenCount,
        })
        currentParagraph = ''
      }
      startIndex += line.length + 1 // +1 for the newline
    }
    else {
      // If we're starting a new paragraph and the line starts a code block,
      // make sure to include the entire code block
      if (currentParagraph === '' && line.trim().startsWith('```')) {
        const blockStart = startIndex
        const matchingBlock = codeBlocks.find(block => block.start === blockStart)
        if (matchingBlock) {
          currentParagraph = matchingBlock.content
          startIndex = matchingBlock.end + 1
          continue
        }
      }

      // Add the line to the current paragraph
      if (currentParagraph !== '') {
        currentParagraph += '\n'
      }
      currentParagraph += line
    }
    startIndex += line.length + 1 // +1 for the newline
  }

  // Add the last paragraph if it exists
  if (currentParagraph.trim() !== '') {
    const tokenCount = tokenizer.encode(currentParagraph).ids.length
    paragraphs.push({
      content: currentParagraph,
      startIndex: startIndex - currentParagraph.length,
      endIndex: startIndex,
      tokenCount,
    })
  }

  // Create chunks with overlap
  const chunks: string[] = []
  let currentChunk: ChunkMeta[] = []
  let currentTokenCount = 0

  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed the chunk size, create a new chunk
    if (currentTokenCount + paragraph.tokenCount > CONFIG.chunkSize && currentChunk.length > 0) {
      // Create the chunk
      chunks.push(currentChunk.map(p => p.content).join('\n\n'))

      // Start a new chunk with overlap
      let overlapTokens = 0
      let i = currentChunk.length - 1
      currentChunk = []
      currentTokenCount = 0

      // Add paragraphs from the end of the previous chunk to create overlap
      while (i >= 0 && overlapTokens < CONFIG.chunkOverlap) {
        const para = paragraphs[i]
        currentChunk.unshift(para)
        overlapTokens += para.tokenCount
        currentTokenCount += para.tokenCount
        i--
      }
    }

    // Add the paragraph to the current chunk
    currentChunk.push(paragraph)
    currentTokenCount += paragraph.tokenCount
  }

  // Add the last chunk if it exists
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.map(p => p.content).join('\n\n'))
  }

  return chunks
}
