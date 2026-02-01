/**
 * IPC Handlers
 *
 * Handles Inter-Process Communication between the renderer
 * and main processes. Routes requests to appropriate services.
 */

import { ipcMain, dialog, shell, clipboard, nativeImage, app, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'
import { DatabaseService } from './database'
import { KeychainService } from './keychain'

// Service instances
let databaseService: DatabaseService
let keychainService: KeychainService

/**
 * Initialize and register all IPC handlers
 */
export function setupIpcHandlers(): void {
  // Initialize services
  databaseService = new DatabaseService()
  keychainService = new KeychainService()

  // Register all handler groups
  registerDatabaseHandlers()
  registerKeychainHandlers()
  registerFileSystemHandlers()
  registerShellHandlers()
  registerAppHandlers()
  registerDialogHandlers()
  registerClipboardHandlers()
  registerWindowHandlers()
  registerAutoUpdateHandlers()

  console.log('IPC handlers registered successfully')
}

// ==================== Database Handlers ====================

function registerDatabaseHandlers(): void {
  // Conversations
  ipcMain.handle('db:conversations:getAll', async () => {
    return databaseService.getConversations()
  })

  ipcMain.handle('db:conversations:get', async (_, id: string) => {
    return databaseService.getConversation(id)
  })

  ipcMain.handle('db:conversations:create', async (_, data: { title?: string; library: string; preview?: string }) => {
    return databaseService.createConversation(data)
  })

  ipcMain.handle('db:conversations:update', async (_, id: string, updates: Record<string, any>) => {
    return databaseService.updateConversation(id, updates)
  })

  ipcMain.handle('db:conversations:delete', async (_, id: string) => {
    return databaseService.deleteConversation(id)
  })

  ipcMain.handle('db:conversations:search', async (_, query: string) => {
    return databaseService.searchConversations(query)
  })

  // Messages
  ipcMain.handle('db:messages:getAll', async (_, conversationId: string) => {
    return databaseService.getMessages(conversationId)
  })

  ipcMain.handle('db:messages:add', async (_, message: Record<string, any>) => {
    return databaseService.addMessage(message as any)
  })

  ipcMain.handle('db:messages:update', async (_, id: string, content: string) => {
    return databaseService.updateMessage(id, content)
  })

  ipcMain.handle('db:messages:delete', async (_, id: string) => {
    return databaseService.deleteMessage(id)
  })

  // Settings
  ipcMain.handle('db:settings:get', async () => {
    return databaseService.getSettings()
  })

  ipcMain.handle('db:settings:save', async (_, settings: Record<string, any>) => {
    return databaseService.saveSettings(settings as any)
  })

  // Snippets
  ipcMain.handle('db:snippets:getAll', async (_, library?: string) => {
    return databaseService.getSnippets(library)
  })

  ipcMain.handle('db:snippets:add', async (_, snippet: Record<string, any>) => {
    return databaseService.addSnippet(snippet as any)
  })

  ipcMain.handle('db:snippets:delete', async (_, id: string) => {
    return databaseService.deleteSnippet(id)
  })

  ipcMain.handle('db:snippets:search', async (_, query: string) => {
    return databaseService.searchSnippets(query)
  })

  // Favorites
  ipcMain.handle('db:favorites:getAll', async () => {
    return databaseService.getFavorites()
  })

  ipcMain.handle('db:favorites:add', async (_, favorite: Record<string, any>) => {
    return databaseService.addFavorite(favorite as any)
  })

  ipcMain.handle('db:favorites:update', async (_, id: string, updates: Record<string, any>) => {
    return databaseService.updateFavorite(id, updates)
  })

  ipcMain.handle('db:favorites:delete', async (_, id: string) => {
    return databaseService.deleteFavorite(id)
  })

  ipcMain.handle('db:favorites:search', async (_, query: string) => {
    return databaseService.searchFavorites(query)
  })

  // RAG
  ipcMain.handle('db:rag:indexMessage', async (_, message: Record<string, any>) => {
    return databaseService.indexMessageForRAG(message as any)
  })

  ipcMain.handle('db:rag:search', async (_, query: string, options?: { topK?: number; libraryId?: string }) => {
    return databaseService.searchRAG(query, options)
  })

  ipcMain.handle('db:rag:getContext', async (_, query: string, options?: { topK?: number; libraryId?: string }) => {
    return databaseService.getRAGContext(query, options)
  })

  // Database management
  ipcMain.handle('db:export', async () => {
    return databaseService.exportDatabase()
  })

  ipcMain.handle('db:import', async (_, data: Uint8Array) => {
    return databaseService.importDatabase(data)
  })
}

// ==================== Keychain Handlers ====================

function registerKeychainHandlers(): void {
  ipcMain.handle('keychain:get', async (_, service: string, account: string) => {
    return keychainService.get(service, account)
  })

  ipcMain.handle('keychain:set', async (_, service: string, account: string, password: string) => {
    return keychainService.set(service, account, password)
  })

  ipcMain.handle('keychain:delete', async (_, service: string, account: string) => {
    return keychainService.delete(service, account)
  })

  ipcMain.handle('keychain:has', async (_, service: string, account: string) => {
    return keychainService.has(service, account)
  })
}

// ==================== File System Handlers ====================

function registerFileSystemHandlers(): void {
  ipcMain.handle('fs:saveFile', async (event, options: {
    defaultPath?: string
    filters?: Array<{ name: string; extensions: string[] }>
    data: string | Uint8Array
    encoding?: 'utf8' | 'binary'
  }) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender)
      const result = await dialog.showSaveDialog(window!, {
        defaultPath: options.defaultPath,
        filters: options.filters
      })

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'Save cancelled' }
      }

      const data = options.data
      if (typeof data === 'string') {
        fs.writeFileSync(result.filePath, data, options.encoding || 'utf8')
      } else {
        fs.writeFileSync(result.filePath, Buffer.from(data))
      }

      return { success: true, path: result.filePath }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('fs:openFile', async (event, options?: {
    filters?: Array<{ name: string; extensions: string[] }>
    encoding?: 'utf8' | 'binary'
  }) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender)
      const result = await dialog.showOpenDialog(window!, {
        properties: ['openFile'],
        filters: options?.filters
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'Open cancelled' }
      }

      const filePath = result.filePaths[0]
      const encoding = options?.encoding || 'utf8'

      if (encoding === 'binary') {
        const data = fs.readFileSync(filePath)
        return { success: true, data: new Uint8Array(data), path: filePath }
      } else {
        const data = fs.readFileSync(filePath, 'utf8')
        return { success: true, data, path: filePath }
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('fs:saveToPath', async (_, filePath: string, data: string | Uint8Array, encoding?: 'utf8' | 'binary') => {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      if (typeof data === 'string') {
        fs.writeFileSync(filePath, data, encoding || 'utf8')
      } else {
        fs.writeFileSync(filePath, Buffer.from(data))
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('fs:getDownloadsPath', async () => {
    return app.getPath('downloads')
  })

  ipcMain.handle('fs:exists', async (_, filePath: string) => {
    return fs.existsSync(filePath)
  })

  ipcMain.handle('fs:openInDefault', async (_, filePath: string) => {
    await shell.openPath(filePath)
  })

  ipcMain.handle('fs:showInFolder', async (_, filePath: string) => {
    shell.showItemInFolder(filePath)
  })
}

// ==================== Shell Handlers ====================

function registerShellHandlers(): void {
  ipcMain.handle('shell:openExternal', async (_, url: string) => {
    // Security: Only allow http/https URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
      await shell.openExternal(url)
    } else {
      throw new Error('Only HTTP/HTTPS URLs are allowed')
    }
  })

  ipcMain.on('shell:showItemInFolder', (_, filePath: string) => {
    shell.showItemInFolder(filePath)
  })
}

// ==================== App Handlers ====================

function registerAppHandlers(): void {
  ipcMain.handle('app:getVersion', async () => {
    return app.getVersion()
  })

  ipcMain.handle('app:getUserDataPath', async () => {
    return app.getPath('userData')
  })

  ipcMain.on('app:quit', () => {
    app.quit()
  })

  ipcMain.on('app:reload', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    window?.reload()
  })

  ipcMain.on('app:toggleDevTools', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    window?.webContents.toggleDevTools()
  })
}

// ==================== Dialog Handlers ====================

function registerDialogHandlers(): void {
  ipcMain.handle('dialog:showMessage', async (event, options: {
    type?: 'none' | 'info' | 'error' | 'question' | 'warning'
    title?: string
    message: string
    detail?: string
    buttons?: string[]
  }) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    return dialog.showMessageBox(window!, {
      type: options.type || 'info',
      title: options.title,
      message: options.message,
      detail: options.detail,
      buttons: options.buttons || ['OK']
    })
  })

  ipcMain.handle('dialog:showError', async (_, title: string, content: string) => {
    dialog.showErrorBox(title, content)
  })

  ipcMain.handle('dialog:confirm', async (event, options: {
    title?: string
    message: string
    detail?: string
  }) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showMessageBox(window!, {
      type: 'question',
      title: options.title || 'Confirm',
      message: options.message,
      detail: options.detail,
      buttons: ['Cancel', 'OK'],
      defaultId: 1,
      cancelId: 0
    })
    return result.response === 1
  })
}

// ==================== Clipboard Handlers ====================

function registerClipboardHandlers(): void {
  ipcMain.on('clipboard:writeText', (_, text: string) => {
    clipboard.writeText(text)
  })

  ipcMain.handle('clipboard:readText', async () => {
    return clipboard.readText()
  })

  ipcMain.on('clipboard:writeImage', (_, dataURL: string) => {
    // Convert data URL to native image
    const base64Data = dataURL.replace(/^data:image\/\w+;base64,/, '')
    const image = nativeImage.createFromBuffer(Buffer.from(base64Data, 'base64'))
    clipboard.writeImage(image)
  })
}

// ==================== Window Handlers ====================

function registerWindowHandlers(): void {
  ipcMain.on('window:minimize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    window?.minimize()
  })

  ipcMain.on('window:maximize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window?.isMaximized()) {
      window.unmaximize()
    } else {
      window?.maximize()
    }
  })

  ipcMain.on('window:close', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    window?.close()
  })

  ipcMain.handle('window:isMaximized', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    return window?.isMaximized() || false
  })

  ipcMain.on('window:toggleFullscreen', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    window?.setFullScreen(!window.isFullScreen())
  })
}

// ==================== Auto-Update Handlers ====================

function registerAutoUpdateHandlers(): void {
  // Import auto-updater functions dynamically to avoid issues in dev mode
  let autoUpdaterModule: typeof import('./auto-updater') | null = null

  const getAutoUpdater = async () => {
    if (!autoUpdaterModule) {
      autoUpdaterModule = await import('./auto-updater')
    }
    return autoUpdaterModule
  }

  ipcMain.handle('update:check', async () => {
    try {
      const updater = await getAutoUpdater()
      await updater.checkForUpdates()
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('update:download', async () => {
    try {
      const updater = await getAutoUpdater()
      await updater.downloadUpdate()
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('update:install', async () => {
    try {
      const updater = await getAutoUpdater()
      updater.installUpdate()
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('update:getInfo', async () => {
    try {
      const updater = await getAutoUpdater()
      return await updater.getUpdateInfo()
    } catch (error) {
      return { currentVersion: app.getVersion(), updateAvailable: false }
    }
  })
}
