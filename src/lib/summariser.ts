import { CONFIG } from '../constants'

// Lazy-load NLP libraries
let nlpInstance: any = null
let modelInstance: any = null

/**
 * Initialize the NLP model lazily
 */
function getNLP() {
  if (!nlpInstance) {
    modelInstance = require('wink-eng-lite-web-model')
    nlpInstance = require('wink-nlp')(modelInstance)
  }
  return nlpInstance
}

/**
 * Extract a summary from markdown text by selecting the most important sentences
 *
 * @param text The markdown text to summarize
 * @param maxSentences Maximum number of sentences to include in the summary
 * @returns A summary of the text
 */
export function summarizeText(text: string, maxSentences = CONFIG.summaryLength): string {
  // Remove markdown code blocks to avoid including them in the summary
  const cleanText = text.replace(/```[\s\S]*?```/g, '')

  // Process the text
  const nlp = getNLP()
  const doc = nlp.readDoc(cleanText)

  if (doc.sentences().length() === 0) {
    return text
  }

  // For simple extractive summarization, we'll take the first few sentences
  // In a more advanced version, we could implement TextRank or similar algorithms
  // to extract the most important sentences
  const sentences = doc.sentences().out()
  const summary = sentences.slice(0, maxSentences).join('\n\n')

  return summary
}

/**
 * Combine multiple search results and summarize them
 *
 * @param contents Array of content chunks to summarize
 * @param maxSentences Maximum number of sentences in the summary
 * @returns A summary of the combined content
 */
export function summarizeResults(contents: string[], maxSentences = CONFIG.summaryLength): string {
  const combinedText = contents.join('\n\n')
  return summarizeText(combinedText, maxSentences)
}