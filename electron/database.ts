/**
 * Native SQLite Database Service for Electron
 *
 * Uses better-sqlite3 for synchronous, high-performance SQLite operations.
 * This runs in the main process and communicates via IPC.
 */

import { app } from 'electron'
import path from 'path'
import fs from 'fs'

// better-sqlite3 is optional - may not be installed on all platforms
let Database: any
try {
  Database = require('better-sqlite3')
} catch (e) {
  console.warn('better-sqlite3 not available, database features will be limited')
}

export interface Conversation {
  id: string
  title: string
  library: string
  createdAt: number
  updatedAt: number
  messageCount: number
  preview?: string
  screenshotBase64?: string
}

export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  hasCode: boolean
  library?: string
}

export interface AppSettings {
  apiKeys: Record<string, string>
  selectedProvider: string
  selectedModel: string
  selectedLibrary: string
  temperature: number
  topP: number
  systemPrompt: string
  theme: 'light' | 'dark' | 'system'
}

export interface CodeSnippet {
  id: string
  title: string
  description: string
  code: string
  library: string
  tags: string
  category?: string
  createdAt: number
  updatedAt: number
}

export interface Favorite {
  id: string
  messageId: string
  conversationId: string
  title: string
  codeContent: string
  libraryId: string
  modelUsed?: string
  screenshotBase64?: string
  createdAt: number
  favoriteOrder: number
  tags?: string
}

export interface RAGDocument {
  id: string
  sourceType: string
  sourceId: string
  chunkText: string
  chunkIndex: number
  metadata?: string
}

export class DatabaseService {
  private db: any
  private dbPath: string

  constructor() {
    // Ensure user data directory exists
    const userDataPath = app.getPath('userData')
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true })
    }

    this.dbPath = path.join(userDataPath, 'maigexr.sqlite')
    this.initialize()
  }

  /**
   * Initialize the database and create tables
   */
  private initialize(): void {
    if (!Database) {
      console.error('better-sqlite3 not available')
      return
    }

    try {
      this.db = new Database(this.dbPath)

      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL')

      // Create tables
      this.createTables()

      console.log(`Database initialized at ${this.dbPath}`)
    } catch (error) {
      console.error('Failed to initialize database:', error)
    }
  }

  /**
   * Create database schema
   */
  private createTables(): void {
    // Conversations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        library TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        message_count INTEGER DEFAULT 0,
        preview TEXT,
        screenshot_base64 TEXT
      )
    `)

    // Messages table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        has_code INTEGER DEFAULT 0,
        library TEXT,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )
    `)

    // Settings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `)

    // Code snippets table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS code_snippets (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        code TEXT NOT NULL,
        library TEXT NOT NULL,
        tags TEXT,
        category TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)

    // Favorites table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS favorites (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL,
        conversation_id TEXT NOT NULL,
        title TEXT NOT NULL,
        code_content TEXT NOT NULL,
        library_id TEXT NOT NULL,
        model_used TEXT,
        screenshot_base64 TEXT,
        created_at INTEGER NOT NULL,
        favorite_order INTEGER NOT NULL,
        tags TEXT
      )
    `)

    // RAG documents table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rag_documents (
        id TEXT PRIMARY KEY,
        source_type TEXT NOT NULL,
        source_id TEXT NOT NULL,
        chunk_text TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        metadata TEXT
      )
    `)

    // RAG embeddings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rag_embeddings (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        embedding BLOB NOT NULL,
        FOREIGN KEY (document_id) REFERENCES rag_documents(id) ON DELETE CASCADE
      )
    `)

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_snippets_library ON code_snippets(library, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_favorites_created ON favorites(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_rag_documents_source ON rag_documents(source_type, source_id);
      CREATE INDEX IF NOT EXISTS idx_rag_embeddings_document ON rag_embeddings(document_id);
    `)

    // Create FTS5 virtual table for full-text search
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS rag_documents_fts USING fts5(
        chunk_text,
        content=rag_documents,
        content_rowid=rowid
      )
    `)

    console.log('Database tables created successfully')
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 11) + Date.now().toString(36)
  }

  // ==================== Conversation Methods ====================

  createConversation(params: { title?: string; library: string; preview?: string }): string {
    const id = this.generateId()
    const now = Date.now()

    const stmt = this.db.prepare(`
      INSERT INTO conversations (id, title, library, created_at, updated_at, message_count, preview)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(id, params.title || 'New Conversation', params.library, now, now, 0, params.preview || null)
    return id
  }

  getConversations(): Conversation[] {
    const stmt = this.db.prepare(`
      SELECT id, title, library, created_at, updated_at, message_count, preview, screenshot_base64
      FROM conversations
      ORDER BY updated_at DESC
    `)

    const rows = stmt.all()
    return rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      library: row.library,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messageCount: row.message_count,
      preview: row.preview,
      screenshotBase64: row.screenshot_base64
    }))
  }

  getConversation(id: string): Conversation | null {
    const stmt = this.db.prepare(`
      SELECT id, title, library, created_at, updated_at, message_count, preview, screenshot_base64
      FROM conversations
      WHERE id = ?
    `)

    const row = stmt.get(id)
    if (!row) return null

    return {
      id: row.id,
      title: row.title,
      library: row.library,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messageCount: row.message_count,
      preview: row.preview,
      screenshotBase64: row.screenshot_base64
    }
  }

  updateConversation(id: string, updates: Partial<Conversation>): void {
    const setClauses: string[] = []
    const values: any[] = []

    if (updates.title !== undefined) {
      setClauses.push('title = ?')
      values.push(updates.title)
    }
    if (updates.library !== undefined) {
      setClauses.push('library = ?')
      values.push(updates.library)
    }
    if (updates.preview !== undefined) {
      setClauses.push('preview = ?')
      values.push(updates.preview)
    }
    if (updates.screenshotBase64 !== undefined) {
      setClauses.push('screenshot_base64 = ?')
      values.push(updates.screenshotBase64)
    }

    setClauses.push('updated_at = ?')
    values.push(Date.now())
    values.push(id)

    const stmt = this.db.prepare(`
      UPDATE conversations
      SET ${setClauses.join(', ')}
      WHERE id = ?
    `)

    stmt.run(...values)
  }

  deleteConversation(id: string): void {
    // Delete messages first (CASCADE should handle this, but explicit is safer)
    this.db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(id)
    this.db.prepare('DELETE FROM conversations WHERE id = ?').run(id)
  }

  searchConversations(query: string): Conversation[] {
    const searchTerm = `%${query.toLowerCase()}%`
    const stmt = this.db.prepare(`
      SELECT id, title, library, created_at, updated_at, message_count, preview, screenshot_base64
      FROM conversations
      WHERE LOWER(title) LIKE ? OR LOWER(preview) LIKE ?
      ORDER BY updated_at DESC
    `)

    const rows = stmt.all(searchTerm, searchTerm)
    return rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      library: row.library,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messageCount: row.message_count,
      preview: row.preview,
      screenshotBase64: row.screenshot_base64
    }))
  }

  // ==================== Message Methods ====================

  addMessage(message: Omit<Message, 'id'>): string {
    const id = this.generateId()

    const insertStmt = this.db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, timestamp, has_code, library)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    insertStmt.run(
      id,
      message.conversationId,
      message.role,
      message.content,
      message.timestamp,
      message.hasCode ? 1 : 0,
      message.library || null
    )

    // Update conversation message count and updated_at
    const updateStmt = this.db.prepare(`
      UPDATE conversations
      SET message_count = message_count + 1,
          updated_at = ?,
          preview = CASE WHEN message_count = 0 THEN ? ELSE preview END
      WHERE id = ?
    `)

    updateStmt.run(message.timestamp, message.content.substring(0, 100), message.conversationId)

    return id
  }

  getMessages(conversationId: string): Message[] {
    const stmt = this.db.prepare(`
      SELECT id, conversation_id, role, content, timestamp, has_code, library
      FROM messages
      WHERE conversation_id = ?
      ORDER BY timestamp ASC
    `)

    const rows = stmt.all(conversationId)
    return rows.map((row: any) => ({
      id: row.id,
      conversationId: row.conversation_id,
      role: row.role,
      content: row.content,
      timestamp: row.timestamp,
      hasCode: row.has_code === 1,
      library: row.library
    }))
  }

  updateMessage(id: string, content: string): void {
    const stmt = this.db.prepare('UPDATE messages SET content = ? WHERE id = ?')
    stmt.run(content, id)
  }

  deleteMessage(id: string): void {
    // Get conversation_id before deleting
    const getStmt = this.db.prepare('SELECT conversation_id FROM messages WHERE id = ?')
    const row = getStmt.get(id)

    if (row) {
      // Delete message
      this.db.prepare('DELETE FROM messages WHERE id = ?').run(id)

      // Update conversation message count
      this.db.prepare(`
        UPDATE conversations
        SET message_count = message_count - 1,
            updated_at = ?
        WHERE id = ?
      `).run(Date.now(), row.conversation_id)
    }
  }

  // ==================== Settings Methods ====================

  saveSettings(settings: AppSettings): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value)
      VALUES ('app_settings', ?)
    `)
    stmt.run(JSON.stringify(settings))
  }

  getSettings(): AppSettings | null {
    const stmt = this.db.prepare("SELECT value FROM settings WHERE key = 'app_settings'")
    const row = stmt.get()

    if (!row) return null

    try {
      return JSON.parse(row.value)
    } catch {
      return null
    }
  }

  // ==================== Snippets Methods ====================

  addSnippet(snippet: Omit<CodeSnippet, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = this.generateId()
    const now = Date.now()

    const stmt = this.db.prepare(`
      INSERT INTO code_snippets (id, title, description, code, library, tags, category, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      snippet.title,
      snippet.description || '',
      snippet.code,
      snippet.library,
      snippet.tags || '',
      snippet.category || null,
      now,
      now
    )

    return id
  }

  getSnippets(library?: string): CodeSnippet[] {
    const stmt = library
      ? this.db.prepare('SELECT * FROM code_snippets WHERE library = ? ORDER BY updated_at DESC')
      : this.db.prepare('SELECT * FROM code_snippets ORDER BY updated_at DESC')

    const rows = library ? stmt.all(library) : stmt.all()

    return rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      code: row.code,
      library: row.library,
      tags: row.tags,
      category: row.category,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  deleteSnippet(id: string): void {
    this.db.prepare('DELETE FROM code_snippets WHERE id = ?').run(id)
  }

  searchSnippets(query: string): CodeSnippet[] {
    const searchTerm = `%${query.toLowerCase()}%`
    const stmt = this.db.prepare(`
      SELECT * FROM code_snippets
      WHERE LOWER(title) LIKE ?
         OR LOWER(description) LIKE ?
         OR LOWER(tags) LIKE ?
      ORDER BY updated_at DESC
    `)

    const rows = stmt.all(searchTerm, searchTerm, searchTerm)

    return rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      code: row.code,
      library: row.library,
      tags: row.tags,
      category: row.category,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  // ==================== Favorites Methods ====================

  addFavorite(favorite: Omit<Favorite, 'id' | 'createdAt' | 'favoriteOrder'>): string {
    const id = this.generateId()
    const now = Date.now()

    // Get max favorite_order
    const maxOrderRow = this.db.prepare('SELECT MAX(favorite_order) as max_order FROM favorites').get()
    const favoriteOrder = (maxOrderRow?.max_order || 0) + 1

    const stmt = this.db.prepare(`
      INSERT INTO favorites (id, message_id, conversation_id, title, code_content, library_id, model_used, screenshot_base64, created_at, favorite_order, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      favorite.messageId,
      favorite.conversationId,
      favorite.title,
      favorite.codeContent,
      favorite.libraryId,
      favorite.modelUsed || null,
      favorite.screenshotBase64 || null,
      now,
      favoriteOrder,
      favorite.tags || null
    )

    return id
  }

  getFavorites(): Favorite[] {
    const stmt = this.db.prepare('SELECT * FROM favorites ORDER BY favorite_order ASC')
    const rows = stmt.all()

    return rows.map((row: any) => ({
      id: row.id,
      messageId: row.message_id,
      conversationId: row.conversation_id,
      title: row.title,
      codeContent: row.code_content,
      libraryId: row.library_id,
      modelUsed: row.model_used,
      screenshotBase64: row.screenshot_base64,
      createdAt: row.created_at,
      favoriteOrder: row.favorite_order,
      tags: row.tags
    }))
  }

  updateFavorite(id: string, updates: Partial<Favorite>): void {
    const setClauses: string[] = []
    const values: any[] = []

    if (updates.title !== undefined) {
      setClauses.push('title = ?')
      values.push(updates.title)
    }
    if (updates.tags !== undefined) {
      setClauses.push('tags = ?')
      values.push(updates.tags)
    }
    if (updates.favoriteOrder !== undefined) {
      setClauses.push('favorite_order = ?')
      values.push(updates.favoriteOrder)
    }
    if (updates.screenshotBase64 !== undefined) {
      setClauses.push('screenshot_base64 = ?')
      values.push(updates.screenshotBase64)
    }

    if (setClauses.length === 0) return

    values.push(id)

    const stmt = this.db.prepare(`
      UPDATE favorites
      SET ${setClauses.join(', ')}
      WHERE id = ?
    `)

    stmt.run(...values)
  }

  deleteFavorite(id: string): void {
    this.db.prepare('DELETE FROM favorites WHERE id = ?').run(id)
  }

  searchFavorites(query: string): Favorite[] {
    const searchTerm = `%${query.toLowerCase()}%`
    const stmt = this.db.prepare(`
      SELECT * FROM favorites
      WHERE LOWER(title) LIKE ?
         OR LOWER(code_content) LIKE ?
         OR LOWER(tags) LIKE ?
      ORDER BY favorite_order ASC
    `)

    const rows = stmt.all(searchTerm, searchTerm, searchTerm)

    return rows.map((row: any) => ({
      id: row.id,
      messageId: row.message_id,
      conversationId: row.conversation_id,
      title: row.title,
      codeContent: row.code_content,
      libraryId: row.library_id,
      modelUsed: row.model_used,
      screenshotBase64: row.screenshot_base64,
      createdAt: row.created_at,
      favoriteOrder: row.favorite_order,
      tags: row.tags
    }))
  }

  // ==================== RAG Methods ====================

  indexMessageForRAG(message: { id: string; content: string; role: string; library?: string }): void {
    // Skip if message is too short or is a user message (we mainly want to index assistant responses)
    if (message.content.length < 50) return

    const docId = this.generateId()

    // Insert document
    const insertDocStmt = this.db.prepare(`
      INSERT INTO rag_documents (id, source_type, source_id, chunk_text, chunk_index, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    insertDocStmt.run(
      docId,
      'message',
      message.id,
      message.content,
      0,
      JSON.stringify({ role: message.role, library: message.library })
    )

    // Update FTS index
    // Note: For full RAG with embeddings, you would call the embedding API here
    // and store the embedding in rag_embeddings table
  }

  searchRAG(query: string, options?: { topK?: number; libraryId?: string }): RAGDocument[] {
    const topK = options?.topK || 10

    // Use FTS5 for keyword search
    const stmt = this.db.prepare(`
      SELECT d.id, d.source_type, d.source_id, d.chunk_text, d.chunk_index, d.metadata
      FROM rag_documents d
      JOIN rag_documents_fts fts ON d.rowid = fts.rowid
      WHERE rag_documents_fts MATCH ?
      LIMIT ?
    `)

    try {
      const rows = stmt.all(query, topK)
      return rows.map((row: any) => ({
        id: row.id,
        sourceType: row.source_type,
        sourceId: row.source_id,
        chunkText: row.chunk_text,
        chunkIndex: row.chunk_index,
        metadata: row.metadata
      }))
    } catch {
      // FTS query might fail, fall back to LIKE search
      const fallbackStmt = this.db.prepare(`
        SELECT id, source_type, source_id, chunk_text, chunk_index, metadata
        FROM rag_documents
        WHERE chunk_text LIKE ?
        LIMIT ?
      `)

      const rows = fallbackStmt.all(`%${query}%`, topK)
      return rows.map((row: any) => ({
        id: row.id,
        sourceType: row.source_type,
        sourceId: row.source_id,
        chunkText: row.chunk_text,
        chunkIndex: row.chunk_index,
        metadata: row.metadata
      }))
    }
  }

  getRAGContext(query: string, options?: { topK?: number; libraryId?: string }): string {
    const documents = this.searchRAG(query, options)

    if (documents.length === 0) {
      return ''
    }

    // Build context string from retrieved documents
    const contextParts = documents.map((doc, index) => {
      return `[Context ${index + 1}]\n${doc.chunkText.substring(0, 1000)}`
    })

    return `Previous relevant context:\n\n${contextParts.join('\n\n')}`
  }

  // ==================== Database Management ====================

  exportDatabase(): Uint8Array {
    // Create a backup and return as buffer
    const backupPath = path.join(app.getPath('temp'), 'maigexr-backup.sqlite')
    this.db.backup(backupPath)
    const data = fs.readFileSync(backupPath)
    fs.unlinkSync(backupPath) // Clean up temp file
    return new Uint8Array(data)
  }

  importDatabase(data: Uint8Array): void {
    // Close current database
    this.db.close()

    // Write new database
    fs.writeFileSync(this.dbPath, Buffer.from(data))

    // Reopen
    this.db = new Database(this.dbPath)
    this.db.pragma('journal_mode = WAL')
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close()
    }
  }
}
