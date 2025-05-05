import type { Model } from 'wink-nlp'

// Declare variables for lazy loading
let nlp: any
let its: any
let modelInstance: Model | null = null

// Very small list of words we never want as a "library keyword".
const stopTerms = new Set([
  'how', 'what', 'when', 'where', 'upgrade', 'update', 'new', 'latest',
  'can', 'i', 'to', 'in', 'for', 'with', 'the', 'a', 'an',
])

/**
 * Initialize the NLP model lazily
 */
function initializeNLP() {
  if (!modelInstance) {
    // Dynamically import dependencies only when needed
    const winkNLP = require('wink-nlp')
    const model = require('wink-eng-lite-web-model')
    
    modelInstance = model
    nlp = winkNLP(model)
    its = nlp.its
  }
  return { nlp, its }
}

/**
 * Pull the most likely tech/library word from free-form user input.
 * Returns `undefined` if nothing useful is found.
 */
export function extractKeyword(text: string): string | undefined {
  const { nlp, its } = initializeNLP()
  
  const doc = nlp.readDoc(text)

  const candidates: string[] = []
  doc.tokens().each((t: any) => {
    const pos = t.out(its.pos) // e.g. "NOUN", "PROPN"
    const value = t.out(its.normal)
    if ((pos === 'NOUN' || pos === 'PROPN') && !stopTerms.has(value)) {
      candidates.push(value)
    }
  })

  return candidates[0]
}