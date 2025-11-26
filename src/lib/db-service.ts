/**
 * SQLite Database Service for WebMaigeXR
 *
 * Uses sql.js (SQLite compiled to WebAssembly) for browser-based SQL storage.
 * Replaces localStorage for better performance and relational data support.
 *
 * IMPORTANT: This module is client-only and should not be imported on the server.
 */

import type { Database, SqlJsStatic } from 'sql.js'

export interface Conversation {
  id: string
  title: string
  library: string
  createdAt: number
  updatedAt: number
  messageCount: number
  preview?: string
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

class DatabaseService {
  private static instance: DatabaseService
  private SQL: SqlJsStatic | null = null
  private db: Database | null = null
  private isInitialized = false
  private initPromise: Promise<void> | null = null

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  /**
   * Initialize the SQLite database
   */
  public async initialize(): Promise<void> {
    // Return existing initialization promise if already initializing
    if (this.initPromise) {
      return this.initPromise
    }

    // Return immediately if already initialized
    if (this.isInitialized && this.db) {
      return Promise.resolve()
    }

    this.initPromise = this.doInitialize()
    await this.initPromise
    this.initPromise = null
  }

  private async doInitialize(): Promise<void> {
    try {
      // Dynamically import sql.js only on the client
      const initSqlJs = (await import('sql.js')).default

      // Initialize sql.js with WebAssembly
      this.SQL = await initSqlJs({
        locateFile: (file: string) => `https://sql.js.org/dist/${file}`
      })

      // Try to load existing database from localStorage
      const savedDb = localStorage.getItem('xrai-sqlite-db')

      if (savedDb) {
        // Load existing database
        const buffer = this.base64ToBuffer(savedDb)
        this.db = new this.SQL.Database(buffer)
        console.log('📦 Loaded existing SQLite database from localStorage')
      } else {
        // Create new database
        this.db = new this.SQL.Database()
        console.log('📦 Created new SQLite database')
      }

      // Create tables
      this.createTables()

      // Migrate data from old localStorage if exists
      await this.migrateFromLocalStorage()

      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize database:', error)
      throw error
    }
  }

  /**
   * Create database schema
   */
  private createTables(): void {
    if (!this.db) throw new Error('Database not initialized')

    // Conversations table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        library TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        message_count INTEGER DEFAULT 0,
        preview TEXT
      )
    `)

    // Messages table
    this.db.run(`
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
    this.db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `)

    // Code snippets table
    this.db.run(`
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

    // Create indexes for better performance
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation
      ON messages(conversation_id, timestamp)
    `)

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_conversations_updated
      ON conversations(updated_at DESC)
    `)

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_snippets_library
      ON code_snippets(library, updated_at DESC)
    `)

    console.log('✅ Database tables created successfully')
  }

  /**
   * Migrate data from old localStorage-based Zustand store
   */
  private async migrateFromLocalStorage(): Promise<void> {
    try {
      const oldData = localStorage.getItem('xrai-assistant-storage')
      if (!oldData) return

      const parsed = JSON.parse(oldData)
      const state = parsed.state

      if (!state) return

      console.log('🔄 Migrating data from localStorage to SQLite...')

      // Migrate settings
      if (state.settings) {
        this.saveSettings(state.settings)
      }

      // Migrate messages to a new conversation
      if (state.messages && state.messages.length > 0) {
        const conversationId = this.generateId()
        const firstUserMessage = state.messages.find((m: any) => m.role === 'user')

        // Create default conversation
        this.db!.run(`
          INSERT INTO conversations (id, title, library, created_at, updated_at, message_count, preview)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          conversationId,
          'Migrated Conversation',
          state.settings?.selectedLibrary || 'react-three-fiber',
          Date.now(),
          Date.now(),
          state.messages.length,
          firstUserMessage?.content?.substring(0, 100) || 'Imported messages'
        ])

        // Migrate messages
        for (const msg of state.messages) {
          this.db!.run(`
            INSERT INTO messages (id, conversation_id, role, content, timestamp, has_code, library)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            msg.id || this.generateId(),
            conversationId,
            msg.role,
            msg.content,
            msg.timestamp || Date.now(),
            msg.hasCode ? 1 : 0,
            msg.library || state.settings?.selectedLibrary
          ])
        }

        console.log(`✅ Migrated ${state.messages.length} messages to conversation: ${conversationId}`)
      }

      // Save database
      this.persist()

      // Remove old localStorage data (optional - comment out to keep backup)
      // localStorage.removeItem('xrai-assistant-storage')

      console.log('✅ Migration complete')
    } catch (error) {
      console.error('Migration error:', error)
      // Don't throw - migration failures shouldn't break initialization
    }
  }

  /**
   * Persist database to localStorage
   */
  public persist(): void {
    if (!this.db) return

    try {
      const data = this.db.export()
      const base64 = this.bufferToBase64(data)
      localStorage.setItem('xrai-sqlite-db', base64)
    } catch (error) {
      console.error('Failed to persist database:', error)
    }
  }

  /**
   * Close database and persist
   */
  public close(): void {
    if (this.db) {
      this.persist()
      this.db.close()
      this.db = null
      this.isInitialized = false
    }
  }

  // ==================== Conversation Methods ====================

  public createConversation(params: {
    title?: string
    library: string
    preview?: string
  }): string {
    if (!this.db) throw new Error('Database not initialized')

    const id = this.generateId()
    const now = Date.now()

    this.db.run(`
      INSERT INTO conversations (id, title, library, created_at, updated_at, message_count, preview)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      params.title || 'New Conversation',
      params.library,
      now,
      now,
      0,
      params.preview || null
    ])

    this.persist()
    return id
  }

  public getConversations(): Conversation[] {
    if (!this.db) throw new Error('Database not initialized')

    const results = this.db.exec(`
      SELECT id, title, library, created_at, updated_at, message_count, preview
      FROM conversations
      ORDER BY updated_at DESC
    `)

    if (results.length === 0) return []

    return results[0].values.map((row: any) => ({
      id: row[0] as string,
      title: row[1] as string,
      library: row[2] as string,
      createdAt: row[3] as number,
      updatedAt: row[4] as number,
      messageCount: row[5] as number,
      preview: row[6] as string | undefined
    }))
  }

  public getConversation(id: string): Conversation | null {
    if (!this.db) throw new Error('Database not initialized')

    const results = this.db.exec(`
      SELECT id, title, library, created_at, updated_at, message_count, preview
      FROM conversations
      WHERE id = ?
    `, [id])

    if (results.length === 0 || results[0].values.length === 0) return null

    const row = results[0].values[0]
    return {
      id: row[0] as string,
      title: row[1] as string,
      library: row[2] as string,
      createdAt: row[3] as number,
      updatedAt: row[4] as number,
      messageCount: row[5] as number,
      preview: row[6] as string | undefined
    }
  }

  public updateConversation(id: string, updates: Partial<Conversation>): void {
    if (!this.db) throw new Error('Database not initialized')

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

    setClauses.push('updated_at = ?')
    values.push(Date.now())

    values.push(id)

    this.db.run(`
      UPDATE conversations
      SET ${setClauses.join(', ')}
      WHERE id = ?
    `, values)

    this.persist()
  }

  public deleteConversation(id: string): void {
    if (!this.db) throw new Error('Database not initialized')

    // Delete messages first (CASCADE should handle this, but explicit is safer)
    this.db.run('DELETE FROM messages WHERE conversation_id = ?', [id])
    this.db.run('DELETE FROM conversations WHERE id = ?', [id])

    this.persist()
  }

  public searchConversations(query: string): Conversation[] {
    if (!this.db) throw new Error('Database not initialized')

    const searchTerm = `%${query.toLowerCase()}%`
    const results = this.db.exec(`
      SELECT id, title, library, created_at, updated_at, message_count, preview
      FROM conversations
      WHERE LOWER(title) LIKE ? OR LOWER(preview) LIKE ?
      ORDER BY updated_at DESC
    `, [searchTerm, searchTerm])

    if (results.length === 0) return []

    return results[0].values.map((row: any) => ({
      id: row[0] as string,
      title: row[1] as string,
      library: row[2] as string,
      createdAt: row[3] as number,
      updatedAt: row[4] as number,
      messageCount: row[5] as number,
      preview: row[6] as string | undefined
    }))
  }

  // ==================== Message Methods ====================

  public addMessage(message: Omit<Message, 'id'>): string {
    if (!this.db) throw new Error('Database not initialized')

    const id = this.generateId()

    this.db.run(`
      INSERT INTO messages (id, conversation_id, role, content, timestamp, has_code, library)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      message.conversationId,
      message.role,
      message.content,
      message.timestamp,
      message.hasCode ? 1 : 0,
      message.library || null
    ])

    // Update conversation message count and updated_at
    this.db.run(`
      UPDATE conversations
      SET message_count = message_count + 1,
          updated_at = ?,
          preview = CASE WHEN message_count = 0 THEN ? ELSE preview END
      WHERE id = ?
    `, [message.timestamp, message.content.substring(0, 100), message.conversationId])

    this.persist()
    return id
  }

  public getMessages(conversationId: string): Message[] {
    if (!this.db) throw new Error('Database not initialized')

    const results = this.db.exec(`
      SELECT id, conversation_id, role, content, timestamp, has_code, library
      FROM messages
      WHERE conversation_id = ?
      ORDER BY timestamp ASC
    `, [conversationId])

    if (results.length === 0) return []

    return results[0].values.map((row: any) => ({
      id: row[0] as string,
      conversationId: row[1] as string,
      role: row[2] as 'user' | 'assistant',
      content: row[3] as string,
      timestamp: row[4] as number,
      hasCode: row[5] === 1,
      library: row[6] as string | undefined
    }))
  }

  public deleteMessage(id: string): void {
    if (!this.db) throw new Error('Database not initialized')

    // Get conversation_id before deleting
    const results = this.db.exec('SELECT conversation_id FROM messages WHERE id = ?', [id])

    if (results.length > 0 && results[0].values.length > 0) {
      const conversationId = results[0].values[0][0] as string

      // Delete message
      this.db.run('DELETE FROM messages WHERE id = ?', [id])

      // Update conversation message count
      this.db.run(`
        UPDATE conversations
        SET message_count = message_count - 1,
            updated_at = ?
        WHERE id = ?
      `, [Date.now(), conversationId])

      this.persist()
    }
  }

  public updateMessage(id: string, content: string): void {
    if (!this.db) throw new Error('Database not initialized')

    this.db.run(`
      UPDATE messages
      SET content = ?
      WHERE id = ?
    `, [content, id])

    this.persist()
  }

  // ==================== Settings Methods ====================

  public saveSettings(settings: AppSettings): void {
    if (!this.db) throw new Error('Database not initialized')

    // Store settings as JSON
    this.db.run(`
      INSERT OR REPLACE INTO settings (key, value)
      VALUES ('app_settings', ?)
    `, [JSON.stringify(settings)])

    this.persist()
  }

  public getSettings(): AppSettings | null {
    if (!this.db) throw new Error('Database not initialized')

    const results = this.db.exec(`
      SELECT value FROM settings WHERE key = 'app_settings'
    `)

    if (results.length === 0 || results[0].values.length === 0) return null

    try {
      return JSON.parse(results[0].values[0][0] as string)
    } catch {
      return null
    }
  }

  // ==================== Encryption Methods ====================

  public saveEncryptedApiKeys(encryptedData: string): void {
    if (!this.db) throw new Error('Database not initialized')

    this.db.run(`
      INSERT OR REPLACE INTO settings (key, value)
      VALUES ('encrypted_api_keys', ?)
    `, [encryptedData])

    this.persist()
  }

  public getEncryptedApiKeys(): string | null {
    if (!this.db) throw new Error('Database not initialized')

    const results = this.db.exec(`
      SELECT value FROM settings WHERE key = 'encrypted_api_keys'
    `)

    if (results.length === 0 || results[0].values.length === 0) return null

    return results[0].values[0][0] as string
  }

  public hasEncryptedApiKeys(): boolean {
    return this.getEncryptedApiKeys() !== null
  }

  // ==================== Code Snippets Methods ====================

  public addSnippet(snippet: Omit<CodeSnippet, 'id' | 'createdAt' | 'updatedAt'>): string {
    if (!this.db) throw new Error('Database not initialized')

    const id = this.generateId()
    const now = Date.now()

    this.db.run(`
      INSERT INTO code_snippets (id, title, description, code, library, tags, category, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      snippet.title,
      snippet.description || '',
      snippet.code,
      snippet.library,
      snippet.tags || '',
      snippet.category || null,
      now,
      now
    ])

    this.persist()
    return id
  }

  public getSnippets(library?: string): CodeSnippet[] {
    if (!this.db) throw new Error('Database not initialized')

    const query = library
      ? 'SELECT * FROM code_snippets WHERE library = ? ORDER BY updated_at DESC'
      : 'SELECT * FROM code_snippets ORDER BY updated_at DESC'

    const results = library
      ? this.db.exec(query, [library])
      : this.db.exec(query)

    if (results.length === 0) return []

    return results[0].values.map((row: any) => ({
      id: row[0] as string,
      title: row[1] as string,
      description: row[2] as string,
      code: row[3] as string,
      library: row[4] as string,
      tags: row[5] as string,
      category: row[6] as string | undefined,
      createdAt: row[7] as number,
      updatedAt: row[8] as number
    }))
  }

  public searchSnippets(query: string): CodeSnippet[] {
    if (!this.db) throw new Error('Database not initialized')

    const searchTerm = `%${query.toLowerCase()}%`
    const results = this.db.exec(`
      SELECT * FROM code_snippets
      WHERE LOWER(title) LIKE ?
         OR LOWER(description) LIKE ?
         OR LOWER(tags) LIKE ?
      ORDER BY updated_at DESC
    `, [searchTerm, searchTerm, searchTerm])

    if (results.length === 0) return []

    return results[0].values.map((row: any) => ({
      id: row[0] as string,
      title: row[1] as string,
      description: row[2] as string,
      code: row[3] as string,
      library: row[4] as string,
      tags: row[5] as string,
      category: row[6] as string | undefined,
      createdAt: row[7] as number,
      updatedAt: row[8] as number
    }))
  }

  public deleteSnippet(id: string): void {
    if (!this.db) throw new Error('Database not initialized')

    this.db.run('DELETE FROM code_snippets WHERE id = ?', [id])
    this.persist()
  }

  // ==================== Utility Methods ====================

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11) + Date.now().toString(36)
  }

  private bufferToBase64(buffer: Uint8Array): string {
    let binary = ''
    const bytes = new Uint8Array(buffer)
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  private base64ToBuffer(base64: string): Uint8Array {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }

  /**
   * Export database as file download
   */
  public exportDatabase(): void {
    if (!this.db) throw new Error('Database not initialized')

    const data = this.db.export()
    // Create a new Uint8Array to ensure it's not a SharedArrayBuffer
    const safeData = new Uint8Array(data)
    const blob = new Blob([safeData], { type: 'application/x-sqlite3' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `xrai-backup-${Date.now()}.sqlite`
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * Import database from file
   */
  public async importDatabase(file: File): Promise<void> {
    if (!this.SQL) throw new Error('SQL.js not initialized')

    const buffer = await file.arrayBuffer()
    this.db = new this.SQL.Database(new Uint8Array(buffer))
    this.persist()
  }
}

// Export singleton instance
export const dbService = DatabaseService.getInstance()
