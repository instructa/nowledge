import { spawn } from 'node:child_process'
import { join } from 'node:path'

export class NomicEmbeddings {
  private modelPath: string
  
  constructor(modelPath: string = 'models/nomic-embed-text-v1.5-matryoshka-128d.Q4_K.gguf') {
    this.modelPath = modelPath
  }
  
  async embed(text: string): Promise<Float32Array> {
    return new Promise((resolve, reject) => {
      // Use Python script as a bridge to llama-cpp-python
      const pythonScript = join(process.cwd(), 'scripts', 'embed.py')
      const proc = spawn('python3', [pythonScript, this.modelPath])
      
      let output = ''
      let error = ''
      
      proc.stdout.on('data', (data) => {
        output += data.toString()
      })
      
      proc.stderr.on('data', (data) => {
        error += data.toString()
      })
      
      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Embedding failed: ${error}`))
          return
        }
        
        try {
          const embedding = JSON.parse(output)
          resolve(new Float32Array(embedding))
        } catch (err) {
          reject(new Error(`Failed to parse embedding: ${err}`))
        }
      })
      
      // Send text to Python process
      proc.stdin.write(text)
      proc.stdin.end()
    })
  }
  
  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    // For now, process sequentially - can optimize later
    const embeddings: Float32Array[] = []
    for (const text of texts) {
      embeddings.push(await this.embed(text))
    }
    return embeddings
  }
}

// Extractive summary using centroid method
export function extractiveSummary(
  sentences: string[],
  embeddings: Float32Array[],
  maxSentences: number = 3
): string {
  if (sentences.length <= maxSentences) {
    return sentences.join(' ')
  }
  
  // Calculate centroid
  const dims = embeddings[0].length
  const centroid = new Float32Array(dims)
  
  for (const emb of embeddings) {
    for (let i = 0; i < dims; i++) {
      centroid[i] += emb[i]
    }
  }
  
  for (let i = 0; i < dims; i++) {
    centroid[i] /= embeddings.length
  }
  
  // Score sentences by cosine similarity to centroid
  const scores = embeddings.map((emb) => {
    let dotProduct = 0
    let normA = 0
    let normB = 0
    
    for (let i = 0; i < dims; i++) {
      dotProduct += emb[i] * centroid[i]
      normA += emb[i] * emb[i]
      normB += centroid[i] * centroid[i]
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  })
  
  // Get top sentences
  const indices = scores
    .map((score, idx) => ({ score, idx }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .map(item => item.idx)
    .sort((a, b) => a - b) // Keep original order
  
  return indices.map(i => sentences[i]).join(' ')
}