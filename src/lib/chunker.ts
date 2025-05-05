import type { Tokenizer } from 'tokenizers'
import { CONFIG } from '../constants'

interface ChunkMeta {
  content: string
  startIndex: number
  endIndex: number
  tokenCount: number
}

/**
 * Split markdown content into chunks maintaining context with overlapping paragraphs.
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
      // Blank line handled – index will be updated at end of loop
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

      // Store the previous chunk before clearing it for overlap processing
      const previousChunk = [...currentChunk]
      
      // Start a new chunk with overlap
      let overlapTokens = 0
      currentChunk = []
      currentTokenCount = 0

      // Add paragraphs from the end of the previous chunk to create overlap
      let i = previousChunk.length - 1
      while (i >= 0 && overlapTokens < CONFIG.chunkOverlap) {
        const para = previousChunk[i]
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