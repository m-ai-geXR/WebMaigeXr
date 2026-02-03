/**
 * Electron Preload Script
 *
 * Provides a secure bridge between the renderer process (web app)
 * and the main process (Node.js/Electron APIs).
 *
 * Uses contextBridge to expose specific APIs while maintaining isolation.
 */

import { contextBridge, ipcRenderer } from 'electron'

/**
 * Database API - SQLite operations via IPC
 */
const databaseAPI = {
  // Conversations
  getConversations: () => ipcRenderer.invoke('db:conversations:getAll'),
  getConversation: (id: string) => ipcRenderer.invoke('db:conversations:get', id),
  createConversation: (data: { title?: string; library: string; preview?: string }) =>
    ipcRenderer.invoke('db:conversations:create', data),
  updateConversation: (id: string, updates: Record<string, any>) =>
    ipcRenderer.invoke('db:conversations:update', id, updates),
  deleteConversation: (id: string) => ipcRenderer.invoke('db:conversations:delete', id),
  searchConversations: (query: string) => ipcRenderer.invoke('db:conversations:search', query),

  // Messages
  getMessages: (conversationId: string) => ipcRenderer.invoke('db:messages:getAll', conversationId),
  addMessage: (message: Record<string, any>) => ipcRenderer.invoke('db:messages:add', message),
  updateMessage: (id: string, content: string) => ipcRenderer.invoke('db:messages:update', id, content),
  deleteMessage: (id: string) => ipcRenderer.invoke('db:messages:delete', id),

  // Settings
  getSettings: () => ipcRenderer.invoke('db:settings:get'),
  saveSettings: (settings: Record<string, any>) => ipcRenderer.invoke('db:settings:save', settings),

  // Snippets
  getSnippets: (library?: string) => ipcRenderer.invoke('db:snippets:getAll', library),
  addSnippet: (snippet: Record<string, any>) => ipcRenderer.invoke('db:snippets:add', snippet),
  deleteSnippet: (id: string) => ipcRenderer.invoke('db:snippets:delete', id),
  searchSnippets: (query: string) => ipcRenderer.invoke('db:snippets:search', query),

  // Favorites
  getFavorites: () => ipcRenderer.invoke('db:favorites:getAll'),
  addFavorite: (favorite: Record<string, any>) => ipcRenderer.invoke('db:favorites:add', favorite),
  updateFavorite: (id: string, updates: Record<string, any>) =>
    ipcRenderer.invoke('db:favorites:update', id, updates),
  deleteFavorite: (id: string) => ipcRenderer.invoke('db:favorites:delete', id),
  searchFavorites: (query: string) => ipcRenderer.invoke('db:favorites:search', query),

  // RAG (Retrieval-Augmented Generation)
  indexMessage: (message: Record<string, any>) => ipcRenderer.invoke('db:rag:indexMessage', message),
  searchRAG: (query: string, options?: { topK?: number; libraryId?: string }) =>
    ipcRenderer.invoke('db:rag:search', query, options),
  getRAGContext: (query: string, options?: { topK?: number; libraryId?: string }) =>
    ipcRenderer.invoke('db:rag:getContext', query, options),

  // Database management
  exportDatabase: () => ipcRenderer.invoke('db:export'),
  importDatabase: (data: Uint8Array) => ipcRenderer.invoke('db:import', data)
}

/**
 * Keychain API - Secure credential storage via OS keychain
 */
const keychainAPI = {
  // Get a stored credential
  get: (service: string, account: string): Promise<string | null> =>
    ipcRenderer.invoke('keychain:get', service, account),

  // Store a credential
  set: (service: string, account: string, password: string): Promise<void> =>
    ipcRenderer.invoke('keychain:set', service, account, password),

  // Delete a stored credential
  delete: (service: string, account: string): Promise<boolean> =>
    ipcRenderer.invoke('keychain:delete', service, account),

  // Check if a credential exists
  has: (service: string, account: string): Promise<boolean> =>
    ipcRenderer.invoke('keychain:has', service, account)
}

/**
 * File System API - Native file operations
 */
const fileSystemAPI = {
  // Save file with native dialog
  saveFile: (options: {
    defaultPath?: string
    filters?: Array<{ name: string; extensions: string[] }>
    data: string | Uint8Array
    encoding?: 'utf8' | 'binary'
  }): Promise<{ success: boolean; path?: string; error?: string }> =>
    ipcRenderer.invoke('fs:saveFile', options),

  // Open file with native dialog
  openFile: (options?: {
    filters?: Array<{ name: string; extensions: string[] }>
    encoding?: 'utf8' | 'binary'
  }): Promise<{ success: boolean; data?: string | Uint8Array; path?: string; error?: string }> =>
    ipcRenderer.invoke('fs:openFile', options),

  // Save to specific path (for exports)
  saveToPath: (
    path: string,
    data: string | Uint8Array,
    encoding?: 'utf8' | 'binary'
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('fs:saveToPath', path, data, encoding),

  // Get downloads folder path
  getDownloadsPath: (): Promise<string> => ipcRenderer.invoke('fs:getDownloadsPath'),

  // Check if file exists
  exists: (path: string): Promise<boolean> => ipcRenderer.invoke('fs:exists', path),

  // Open file in default application
  openInDefault: (path: string): Promise<void> => ipcRenderer.invoke('fs:openInDefault', path),

  // Show file in folder
  showInFolder: (path: string): Promise<void> => ipcRenderer.invoke('fs:showInFolder', path)
}

/**
 * Shell API - External operations
 */
const shellAPI = {
  // Open URL in default browser
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:openExternal', url),

  // Show item in folder
  showItemInFolder: (path: string): void => ipcRenderer.send('shell:showItemInFolder', path)
}

/**
 * App API - Application-level operations
 */
const appAPI = {
  // Get app version
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),

  // Get platform
  getPlatform: (): NodeJS.Platform => process.platform,

  // Check if running in Electron
  isElectron: true,

  // Get user data path
  getUserDataPath: (): Promise<string> => ipcRenderer.invoke('app:getUserDataPath'),

  // Quit application
  quit: (): void => ipcRenderer.send('app:quit'),

  // Reload window
  reload: (): void => ipcRenderer.send('app:reload'),

  // Toggle DevTools
  toggleDevTools: (): void => ipcRenderer.send('app:toggleDevTools'),

  // Minimize window
  minimize: (): void => ipcRenderer.send('window:minimize'),

  // Maximize/restore window
  maximize: (): void => ipcRenderer.send('window:maximize'),

  // Close window
  close: (): void => ipcRenderer.send('window:close'),

  // Check if window is maximized
  isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),

  // Toggle fullscreen
  toggleFullscreen: (): void => ipcRenderer.send('window:toggleFullscreen')
}

/**
 * Dialog API - Native dialogs
 */
const dialogAPI = {
  // Show message box
  showMessage: (options: {
    type?: 'none' | 'info' | 'error' | 'question' | 'warning'
    title?: string
    message: string
    detail?: string
    buttons?: string[]
  }): Promise<{ response: number }> => ipcRenderer.invoke('dialog:showMessage', options),

  // Show error dialog
  showError: (title: string, content: string): Promise<void> =>
    ipcRenderer.invoke('dialog:showError', title, content),

  // Show confirmation dialog
  confirm: (options: {
    title?: string
    message: string
    detail?: string
  }): Promise<boolean> => ipcRenderer.invoke('dialog:confirm', options)
}

/**
 * Clipboard API - Clipboard operations
 */
const clipboardAPI = {
  // Write text to clipboard
  writeText: (text: string): void => ipcRenderer.send('clipboard:writeText', text),

  // Read text from clipboard
  readText: (): Promise<string> => ipcRenderer.invoke('clipboard:readText'),

  // Write image to clipboard
  writeImage: (dataURL: string): void => ipcRenderer.send('clipboard:writeImage', dataURL)
}

/**
 * Event listeners for main process events
 */
const eventsAPI = {
  // Listen for menu actions
  onMenuAction: (callback: (action: string) => void) => {
    const handler = (_: any, action: string) => callback(action)
    ipcRenderer.on('menu:action', handler)
    return () => ipcRenderer.removeListener('menu:action', handler)
  },

  // Listen for theme changes
  onThemeChange: (callback: (theme: 'light' | 'dark') => void) => {
    const handler = (_: any, theme: 'light' | 'dark') => callback(theme)
    ipcRenderer.on('theme:changed', handler)
    return () => ipcRenderer.removeListener('theme:changed', handler)
  },

  // Listen for window focus/blur
  onWindowFocus: (callback: (focused: boolean) => void) => {
    const focusHandler = () => callback(true)
    const blurHandler = () => callback(false)
    ipcRenderer.on('window:focus', focusHandler)
    ipcRenderer.on('window:blur', blurHandler)
    return () => {
      ipcRenderer.removeListener('window:focus', focusHandler)
      ipcRenderer.removeListener('window:blur', blurHandler)
    }
  },

  // Listen for update status
  onUpdateStatus: (callback: (data: { status: string; data?: any }) => void) => {
    const handler = (_: any, data: { status: string; data?: any }) => callback(data)
    ipcRenderer.on('update-status', handler)
    return () => ipcRenderer.removeListener('update-status', handler)
  }
}

/**
 * Auto-Update API - Application updates
 */
const updateAPI = {
  // Check for updates
  check: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('update:check'),

  // Download available update
  download: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('update:download'),

  // Install downloaded update and restart
  install: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('update:install'),

  // Get current version and update info
  getInfo: (): Promise<{
    currentVersion: string
    updateAvailable: boolean
    latestVersion?: string
  }> => ipcRenderer.invoke('update:getInfo')
}

// Expose APIs to renderer process via contextBridge
contextBridge.exposeInMainWorld('electronAPI', {
  database: databaseAPI,
  keychain: keychainAPI,
  fileSystem: fileSystemAPI,
  shell: shellAPI,
  app: appAPI,
  dialog: dialogAPI,
  clipboard: clipboardAPI,
  events: eventsAPI,
  update: updateAPI
})

// Type declarations are in src/lib/platform.ts to avoid conflicts
// The preload script uses contextBridge which handles the actual type at runtime
