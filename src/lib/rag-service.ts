/**
 * RAG (Retrieval-Augmented Generation) Service
 *
 * Provides semantic search and context building for AI conversations.
 * Works with both web (sql.js) and Electron (better-sqlite3) databases.
 */

import { isElectron, getElectronAPI } from './platform'
import {
  generateEmbedding,
  cosineSimilarity,
  EMBEDDING_DIMENSION
} from './embedding-service'

// Token limit for context (approximately 3000 tokens = 12000 chars)
const MAX_CONTEXT_CHARS = 12000

// Minimum similarity threshold for including results
const MIN_SIMILARITY_THRESHOLD = 0.3

export interface RAGDocument {
  id: string
  sourceType: 'message' | 'conversation' | 'snippet'
  sourceId: string
  chunkText: string
  chunkIndex: number
  metadata?: Record<string, any>
  similarity?: number
}

export interface RAGSearchOptions {
  topK?: number
  libraryId?: string
  minSimilarity?: number
  sourceTypes?: Array<'message' | 'conversation' | 'snippet'>
}

export interface RAGContextOptions extends RAGSearchOptions {
  maxChars?: number
  includeMetadata?: boolean
}

/**
 * RAG Service class
 * Handles document indexing, search, and context building
 */
export class RAGService {
  private apiKey: string | null = null
  private embeddings: Map<string, number[]> = new Map()
  private documents: Map<string, RAGDocument> = new Map()
  private isElectronApp: boolean

  constructor() {
    this.isElectronApp = isElectron()
  }

  /**
   * Set the Together AI API key for embedding generation
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
  }

  /**
   * Check if RAG is available (API key set)
   */
  isAvailable(): boolean {
    return !!this.apiKey && this.apiKey.trim() !== ''
  }

  /**
   * Index a message for future retrieval
   */
  async indexMessage(message: {
    id: string
    content: string
    role: 'user' | 'assistant'
    conversationId: string
    library?: string
  }): Promise<void> {
    if (!this.isAvailable()) {
      console.warn('RAG not available - API key not set')
      return
    }

    // Skip short messages
    if (message.content.length < 50) {
      return
    }

    try {
      if (this.isElectronApp) {
        // Use Electron IPC for database operations
        const api = getElectronAPI()
        if (api) {
          await api.database.indexMessage({
            id: message.id,
            content: message.content,
            role: message.role,
            conversationId: message.conversationId,
            library: message.library
          })
        }
      } else {
        // Web mode - store in memory and generate embedding
        const result = await generateEmbedding(message.content, this.apiKey!)

        const doc: RAGDocument = {
          id: `doc_${message.id}`,
          sourceType: 'message',
          sourceId: message.id,
          chunkText: message.content,
          chunkIndex: 0,
          metadata: {
            role: message.role,
            conversationId: message.conversationId,
            library: message.library
          }
        }

        this.documents.set(doc.id, doc)
        this.embeddings.set(doc.id, result.embedding)
      }
    } catch (error) {
      console.error('Failed to index message for RAG:', error)
    }
  }

  /**
   * Search for relevant documents using semantic similarity
   */
  async search(
    query: string,
    options: RAGSearchOptions = {}
  ): Promise<RAGDocument[]> {
    if (!this.isAvailable()) {
      return []
    }

    const {
      topK = 10,
      libraryId,
      minSimilarity = MIN_SIMILARITY_THRESHOLD,
      sourceTypes
    } = options

    try {
      if (this.isElectronApp) {
        // Use Electron IPC for database search
        const api = getElectronAPI()
        if (api) {
          return await api.database.searchRAG(query, { topK, libraryId })
        }
        return []
      } else {
        // Web mode - in-memory semantic search
        if (this.documents.size === 0) {
          return []
        }

        // Generate query embedding
        const queryResult = await generateEmbedding(query, this.apiKey!)
        const queryEmbedding = queryResult.embedding

        // Calculate similarities
        const results: RAGDocument[] = []

        for (const [docId, doc] of this.documents) {
          // Filter by source type if specified
          if (sourceTypes && !sourceTypes.includes(doc.sourceType)) {
            continue
          }

          // Filter by library if specified
          if (libraryId && doc.metadata?.library !== libraryId) {
            continue
          }

          // Get embedding
          const docEmbedding = this.embeddings.get(docId)
          if (!docEmbedding) continue

          // Calculate similarity
          const similarity = cosineSimilarity(queryEmbedding, docEmbedding)

          if (similarity >= minSimilarity) {
            results.push({
              ...doc,
              similarity
            })
          }
        }

        // Sort by similarity and return top K
        results.sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
        return results.slice(0, topK)
      }
    } catch (error) {
      console.error('RAG search failed:', error)
      return []
    }
  }

  /**
   * Build context string from search results
   */
  async buildContext(
    query: string,
    options: RAGContextOptions = {}
  ): Promise<string> {
    const {
      maxChars = MAX_CONTEXT_CHARS,
      includeMetadata = false,
      ...searchOptions
    } = options

    try {
      if (this.isElectronApp) {
        // Use Electron IPC
        const api = getElectronAPI()
        if (api) {
          return await api.database.getRAGContext(query, searchOptions)
        }
        return ''
      }

      // Web mode - build context from search results
      const documents = await this.search(query, searchOptions)

      if (documents.length === 0) {
        return ''
      }

      // Build context string
      const contextParts: string[] = []
      let totalChars = 0

      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i]

        // Truncate if too long
        let chunkText = doc.chunkText
        if (chunkText.length > 1500) {
          chunkText = chunkText.substring(0, 1500) + '...'
        }

        // Build context entry
        let entry = `[Context ${i + 1}]`

        if (includeMetadata && doc.metadata) {
          const meta = doc.metadata
          if (meta.role) entry += ` (${meta.role})`
          if (meta.library) entry += ` [${meta.library}]`
        }

        if (doc.similarity !== undefined) {
          entry += ` (relevance: ${(doc.similarity * 100).toFixed(0)}%)`
        }

        entry += `\n${chunkText}`

        // Check if we have room
        if (totalChars + entry.length > maxChars) {
          break
        }

        contextParts.push(entry)
        totalChars += entry.length
      }

      if (contextParts.length === 0) {
        return ''
      }

      return `Previous relevant context from your conversation history:\n\n${contextParts.join('\n\n')}`
    } catch (error) {
      console.error('Failed to build RAG context:', error)
      return ''
    }
  }

  /**
   * Clear all indexed documents
   */
  clear(): void {
    this.documents.clear()
    this.embeddings.clear()
  }

  /**
   * Get statistics about indexed documents
   */
  getStats(): { documentCount: number; embeddingCount: number } {
    return {
      documentCount: this.documents.size,
      embeddingCount: this.embeddings.size
    }
  }
}

// Singleton instance
let ragServiceInstance: RAGService | null = null

export function getRAGService(): RAGService {
  if (!ragServiceInstance) {
    ragServiceInstance = new RAGService()
  }
  return ragServiceInstance
}

/**
 * Convenience function to index a message
 */
export async function indexMessageForRAG(
  message: {
    id: string
    content: string
    role: 'user' | 'assistant'
    conversationId: string
    library?: string
  },
  apiKey: string
): Promise<void> {
  const service = getRAGService()
  service.setApiKey(apiKey)
  await service.indexMessage(message)
}

/**
 * Convenience function to get RAG context
 */
export async function getRAGContext(
  query: string,
  apiKey: string,
  options?: RAGContextOptions
): Promise<string> {
  const service = getRAGService()
  service.setApiKey(apiKey)
  return service.buildContext(query, options)
}
