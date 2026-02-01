/**
 * Favorites Service
 *
 * Manages favorite messages and code snippets.
 * Works with both web (sql.js) and Electron (better-sqlite3) databases.
 */

import { isElectron, getElectronAPI } from './platform'
import { dbService } from './db-service'

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

export interface CreateFavoriteParams {
  messageId: string
  conversationId: string
  title: string
  codeContent: string
  libraryId: string
  modelUsed?: string
  screenshotBase64?: string
  tags?: string
}

export interface UpdateFavoriteParams {
  title?: string
  tags?: string
  favoriteOrder?: number
  screenshotBase64?: string
}

/**
 * Favorites Service class
 */
class FavoritesService {
  private isElectronApp: boolean

  constructor() {
    this.isElectronApp = isElectron()
  }

  /**
   * Get all favorites
   */
  async getAll(): Promise<Favorite[]> {
    if (this.isElectronApp) {
      const api = getElectronAPI()
      if (api) {
        return await api.database.getFavorites()
      }
    }

    // Web mode - query local database
    return this.getFromWebDB()
  }

  /**
   * Get favorites from web database
   */
  private getFromWebDB(): Favorite[] {
    // This would require adding favorites support to db-service.ts
    // For now, return empty array - will be implemented when db-service is updated
    try {
      const db = (dbService as any).db
      if (!db) return []

      const results = db.exec(`
        SELECT id, message_id, conversation_id, title, code_content, library_id,
               model_used, screenshot_base64, created_at, favorite_order, tags
        FROM favorites
        ORDER BY favorite_order ASC
      `)

      if (results.length === 0) return []

      return results[0].values.map((row: any) => ({
        id: row[0],
        messageId: row[1],
        conversationId: row[2],
        title: row[3],
        codeContent: row[4],
        libraryId: row[5],
        modelUsed: row[6],
        screenshotBase64: row[7],
        createdAt: row[8],
        favoriteOrder: row[9],
        tags: row[10]
      }))
    } catch (error) {
      console.error('Failed to get favorites from web DB:', error)
      return []
    }
  }

  /**
   * Add a new favorite
   */
  async add(params: CreateFavoriteParams): Promise<string> {
    if (this.isElectronApp) {
      const api = getElectronAPI()
      if (api) {
        return await api.database.addFavorite(params)
      }
    }

    // Web mode - add to local database
    return this.addToWebDB(params)
  }

  /**
   * Add favorite to web database
   */
  private addToWebDB(params: CreateFavoriteParams): string {
    try {
      const db = (dbService as any).db
      if (!db) throw new Error('Database not initialized')

      const id = Math.random().toString(36).substring(2, 11) + Date.now().toString(36)
      const now = Date.now()

      // Get max favorite_order
      const maxOrderResult = db.exec('SELECT MAX(favorite_order) as max_order FROM favorites')
      const maxOrder = maxOrderResult.length > 0 && maxOrderResult[0].values.length > 0
        ? (maxOrderResult[0].values[0][0] || 0)
        : 0
      const favoriteOrder = Number(maxOrder) + 1

      db.run(`
        INSERT INTO favorites (id, message_id, conversation_id, title, code_content, library_id,
                              model_used, screenshot_base64, created_at, favorite_order, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        params.messageId,
        params.conversationId,
        params.title,
        params.codeContent,
        params.libraryId,
        params.modelUsed || null,
        params.screenshotBase64 || null,
        now,
        favoriteOrder,
        params.tags || null
      ])

      dbService.persist()
      return id
    } catch (error) {
      console.error('Failed to add favorite to web DB:', error)
      throw error
    }
  }

  /**
   * Update a favorite
   */
  async update(id: string, params: UpdateFavoriteParams): Promise<void> {
    if (this.isElectronApp) {
      const api = getElectronAPI()
      if (api) {
        await api.database.updateFavorite(id, params)
        return
      }
    }

    // Web mode - update in local database
    this.updateInWebDB(id, params)
  }

  /**
   * Update favorite in web database
   */
  private updateInWebDB(id: string, params: UpdateFavoriteParams): void {
    try {
      const db = (dbService as any).db
      if (!db) throw new Error('Database not initialized')

      const setClauses: string[] = []
      const values: any[] = []

      if (params.title !== undefined) {
        setClauses.push('title = ?')
        values.push(params.title)
      }
      if (params.tags !== undefined) {
        setClauses.push('tags = ?')
        values.push(params.tags)
      }
      if (params.favoriteOrder !== undefined) {
        setClauses.push('favorite_order = ?')
        values.push(params.favoriteOrder)
      }
      if (params.screenshotBase64 !== undefined) {
        setClauses.push('screenshot_base64 = ?')
        values.push(params.screenshotBase64)
      }

      if (setClauses.length === 0) return

      values.push(id)

      db.run(`
        UPDATE favorites
        SET ${setClauses.join(', ')}
        WHERE id = ?
      `, values)

      dbService.persist()
    } catch (error) {
      console.error('Failed to update favorite in web DB:', error)
      throw error
    }
  }

  /**
   * Delete a favorite
   */
  async delete(id: string): Promise<void> {
    if (this.isElectronApp) {
      const api = getElectronAPI()
      if (api) {
        await api.database.deleteFavorite(id)
        return
      }
    }

    // Web mode - delete from local database
    this.deleteFromWebDB(id)
  }

  /**
   * Delete favorite from web database
   */
  private deleteFromWebDB(id: string): void {
    try {
      const db = (dbService as any).db
      if (!db) throw new Error('Database not initialized')

      db.run('DELETE FROM favorites WHERE id = ?', [id])
      dbService.persist()
    } catch (error) {
      console.error('Failed to delete favorite from web DB:', error)
      throw error
    }
  }

  /**
   * Search favorites
   */
  async search(query: string): Promise<Favorite[]> {
    if (this.isElectronApp) {
      const api = getElectronAPI()
      if (api) {
        return await api.database.searchFavorites(query)
      }
    }

    // Web mode - search in local database
    return this.searchInWebDB(query)
  }

  /**
   * Search favorites in web database
   */
  private searchInWebDB(query: string): Favorite[] {
    try {
      const db = (dbService as any).db
      if (!db) return []

      const searchTerm = `%${query.toLowerCase()}%`
      const results = db.exec(`
        SELECT id, message_id, conversation_id, title, code_content, library_id,
               model_used, screenshot_base64, created_at, favorite_order, tags
        FROM favorites
        WHERE LOWER(title) LIKE ?
           OR LOWER(code_content) LIKE ?
           OR LOWER(tags) LIKE ?
        ORDER BY favorite_order ASC
      `, [searchTerm, searchTerm, searchTerm])

      if (results.length === 0) return []

      return results[0].values.map((row: any) => ({
        id: row[0],
        messageId: row[1],
        conversationId: row[2],
        title: row[3],
        codeContent: row[4],
        libraryId: row[5],
        modelUsed: row[6],
        screenshotBase64: row[7],
        createdAt: row[8],
        favoriteOrder: row[9],
        tags: row[10]
      }))
    } catch (error) {
      console.error('Failed to search favorites in web DB:', error)
      return []
    }
  }

  /**
   * Reorder favorites
   */
  async reorder(orderedIds: string[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      await this.update(orderedIds[i], { favoriteOrder: i + 1 })
    }
  }

  /**
   * Check if a message is favorited
   */
  async isFavorited(messageId: string): Promise<boolean> {
    const favorites = await this.getAll()
    return favorites.some(f => f.messageId === messageId)
  }

  /**
   * Get favorite by message ID
   */
  async getByMessageId(messageId: string): Promise<Favorite | null> {
    const favorites = await this.getAll()
    return favorites.find(f => f.messageId === messageId) || null
  }

  /**
   * Get favorites count
   */
  async getCount(): Promise<number> {
    const favorites = await this.getAll()
    return favorites.length
  }

  /**
   * Get favorites by library
   */
  async getByLibrary(libraryId: string): Promise<Favorite[]> {
    const favorites = await this.getAll()
    return favorites.filter(f => f.libraryId === libraryId)
  }

  /**
   * Get favorites by tag
   */
  async getByTag(tag: string): Promise<Favorite[]> {
    const favorites = await this.getAll()
    return favorites.filter(f =>
      f.tags?.toLowerCase().includes(tag.toLowerCase())
    )
  }

  /**
   * Get all unique tags
   */
  async getAllTags(): Promise<string[]> {
    const favorites = await this.getAll()
    const tags = new Set<string>()

    for (const favorite of favorites) {
      if (favorite.tags) {
        favorite.tags.split(',').forEach(tag => {
          const trimmed = tag.trim()
          if (trimmed) tags.add(trimmed)
        })
      }
    }

    return Array.from(tags).sort()
  }
}

// Singleton instance
let favoritesServiceInstance: FavoritesService | null = null

export function getFavoritesService(): FavoritesService {
  if (!favoritesServiceInstance) {
    favoritesServiceInstance = new FavoritesService()
  }
  return favoritesServiceInstance
}

// Convenience exports
export const favoritesService = {
  getAll: () => getFavoritesService().getAll(),
  add: (params: CreateFavoriteParams) => getFavoritesService().add(params),
  update: (id: string, params: UpdateFavoriteParams) => getFavoritesService().update(id, params),
  delete: (id: string) => getFavoritesService().delete(id),
  search: (query: string) => getFavoritesService().search(query),
  reorder: (orderedIds: string[]) => getFavoritesService().reorder(orderedIds),
  isFavorited: (messageId: string) => getFavoritesService().isFavorited(messageId),
  getByMessageId: (messageId: string) => getFavoritesService().getByMessageId(messageId),
  getCount: () => getFavoritesService().getCount(),
  getByLibrary: (libraryId: string) => getFavoritesService().getByLibrary(libraryId),
  getByTag: (tag: string) => getFavoritesService().getByTag(tag),
  getAllTags: () => getFavoritesService().getAllTags()
}
