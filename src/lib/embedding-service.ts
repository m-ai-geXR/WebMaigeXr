/**
 * Embedding Service for RAG System
 *
 * Generates vector embeddings using Together AI's embedding API.
 * Used for semantic search in the RAG (Retrieval-Augmented Generation) system.
 */

// Together AI embedding endpoint
const TOGETHER_AI_EMBEDDING_URL = 'https://api.together.xyz/v1/embeddings'

// Embedding model - small, fast, good quality
const EMBEDDING_MODEL = 'togethercomputer/m2-bert-80M-8k-retrieval'

// Embedding dimension for this model
export const EMBEDDING_DIMENSION = 768

export interface EmbeddingResult {
  embedding: number[]
  tokens: number
}

export interface BatchEmbeddingResult {
  embeddings: number[][]
  totalTokens: number
}

/**
 * Generate an embedding vector for a single text
 */
export async function generateEmbedding(
  text: string,
  apiKey: string
): Promise<EmbeddingResult> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Together AI API key required for embeddings')
  }

  // Truncate text if too long (8k tokens ~ 32k chars)
  const truncatedText = text.length > 30000 ? text.substring(0, 30000) : text

  const response = await fetch(TOGETHER_AI_EMBEDDING_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: truncatedText
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Together AI embedding error: ${response.status} - ${error}`)
  }

  const data = await response.json()

  if (!data.data || data.data.length === 0) {
    throw new Error('No embedding returned from API')
  }

  return {
    embedding: data.data[0].embedding,
    tokens: data.usage?.total_tokens || 0
  }
}

/**
 * Generate embeddings for multiple texts in a single batch
 */
export async function generateBatchEmbeddings(
  texts: string[],
  apiKey: string
): Promise<BatchEmbeddingResult> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Together AI API key required for embeddings')
  }

  if (texts.length === 0) {
    return { embeddings: [], totalTokens: 0 }
  }

  // Truncate texts if too long
  const truncatedTexts = texts.map(text =>
    text.length > 30000 ? text.substring(0, 30000) : text
  )

  // Process in batches of 8 to avoid rate limits
  const BATCH_SIZE = 8
  const allEmbeddings: number[][] = []
  let totalTokens = 0

  for (let i = 0; i < truncatedTexts.length; i += BATCH_SIZE) {
    const batch = truncatedTexts.slice(i, i + BATCH_SIZE)

    const response = await fetch(TOGETHER_AI_EMBEDDING_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: batch
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Together AI embedding error: ${response.status} - ${error}`)
    }

    const data = await response.json()

    if (data.data) {
      // Sort by index to maintain order
      const sortedData = data.data.sort((a: any, b: any) => a.index - b.index)
      for (const item of sortedData) {
        allEmbeddings.push(item.embedding)
      }
    }

    totalTokens += data.usage?.total_tokens || 0

    // Rate limiting - wait between batches
    if (i + BATCH_SIZE < truncatedTexts.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  return {
    embeddings: allEmbeddings,
    totalTokens
  }
}

/**
 * Calculate cosine similarity between two embedding vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same dimension')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB)

  if (magnitude === 0) {
    return 0
  }

  return dotProduct / magnitude
}

/**
 * Find the top-K most similar embeddings from a collection
 */
export function findTopKSimilar(
  queryEmbedding: number[],
  embeddings: Array<{ id: string; embedding: number[] }>,
  topK: number = 5
): Array<{ id: string; similarity: number }> {
  const similarities = embeddings.map(item => ({
    id: item.id,
    similarity: cosineSimilarity(queryEmbedding, item.embedding)
  }))

  // Sort by similarity descending
  similarities.sort((a, b) => b.similarity - a.similarity)

  return similarities.slice(0, topK)
}

/**
 * Convert Float32Array to number array (for JSON serialization)
 */
export function float32ToNumberArray(float32: Float32Array): number[] {
  return Array.from(float32)
}

/**
 * Convert number array to Float32Array (for efficient storage)
 */
export function numberArrayToFloat32(arr: number[]): Float32Array {
  return new Float32Array(arr)
}

/**
 * Normalize an embedding vector to unit length
 */
export function normalizeEmbedding(embedding: number[]): number[] {
  let norm = 0
  for (const value of embedding) {
    norm += value * value
  }
  norm = Math.sqrt(norm)

  if (norm === 0) {
    return embedding
  }

  return embedding.map(value => value / norm)
}
