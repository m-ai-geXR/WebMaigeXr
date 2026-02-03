/**
 * Platform Detection Utilities
 *
 * Provides utilities to detect the current platform (Electron vs Web)
 * and access platform-specific APIs in a safe, type-safe manner.
 */

/**
 * Check if we're running in an Electron environment
 */
export const isElectron = (): boolean => {
  // Check if window exists (not SSR)
  if (typeof window === 'undefined') {
    return false
  }

  // Check for electronAPI exposed by preload script
  if (window.electronAPI?.app?.isElectron) {
    return true
  }

  // Fallback detection methods
  const userAgent = navigator.userAgent.toLowerCase()
  return userAgent.includes('electron')
}

/**
 * Check if we're running in a web browser
 */
export const isWeb = (): boolean => {
  return !isElectron()
}

/**
 * Check if we're in development mode
 */
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development'
}

/**
 * Get the current platform name
 */
export type PlatformName = 'electron-win32' | 'electron-darwin' | 'electron-linux' | 'web'

export const getPlatformName = (): PlatformName => {
  if (!isElectron()) {
    return 'web'
  }

  const platform = window.electronAPI?.app?.getPlatform()
  switch (platform) {
    case 'win32':
      return 'electron-win32'
    case 'darwin':
      return 'electron-darwin'
    case 'linux':
      return 'electron-linux'
    default:
      return 'web'
  }
}

/**
 * Platform capabilities interface
 */
export interface PlatformCapabilities {
  hasNativeFileSystem: boolean
  hasNativeKeychain: boolean
  hasNativeDatabase: boolean
  hasNativeMenu: boolean
  hasNativeClipboard: boolean
  hasNativeDialogs: boolean
  supportsMultipleWindows: boolean
  supportsAutoUpdate: boolean
  supportsTray: boolean
}

/**
 * Get the capabilities available on the current platform
 */
export const getPlatformCapabilities = (): PlatformCapabilities => {
  const electron = isElectron()

  return {
    hasNativeFileSystem: electron,
    hasNativeKeychain: electron,
    hasNativeDatabase: electron,
    hasNativeMenu: electron,
    hasNativeClipboard: electron,
    hasNativeDialogs: electron,
    supportsMultipleWindows: electron,
    supportsAutoUpdate: electron,
    supportsTray: electron
  }
}

/**
 * Safe wrapper for accessing Electron APIs
 * Returns null if not in Electron or API not available
 */
export const getElectronAPI = () => {
  if (typeof window === 'undefined') {
    return null
  }
  return window.electronAPI || null
}

/**
 * Execute a function only in Electron environment
 */
export const ifElectron = <T>(fn: (api: NonNullable<typeof window.electronAPI>) => T): T | null => {
  const api = getElectronAPI()
  if (api) {
    return fn(api)
  }
  return null
}

/**
 * Execute different functions based on platform
 */
export const platformSwitch = <T>(options: {
  electron?: (api: NonNullable<typeof window.electronAPI>) => T
  web?: () => T
  default?: () => T
}): T | null => {
  const api = getElectronAPI()

  if (api && options.electron) {
    return options.electron(api)
  }

  if (!api && options.web) {
    return options.web()
  }

  if (options.default) {
    return options.default()
  }

  return null
}

/**
 * Platform-specific storage key prefix
 */
export const getStoragePrefix = (): string => {
  return isElectron() ? 'maigexr-desktop' : 'maigexr-web'
}

/**
 * Platform information for debugging
 */
export interface PlatformInfo {
  type: 'electron' | 'web'
  os: NodeJS.Platform | 'browser'
  version?: string
  userAgent: string
  capabilities: PlatformCapabilities
}

export const getPlatformInfo = async (): Promise<PlatformInfo> => {
  const api = getElectronAPI()

  if (api) {
    const version = await api.app.getVersion()
    return {
      type: 'electron',
      os: api.app.getPlatform(),
      version,
      userAgent: navigator.userAgent,
      capabilities: getPlatformCapabilities()
    }
  }

  return {
    type: 'web',
    os: 'browser',
    userAgent: navigator.userAgent,
    capabilities: getPlatformCapabilities()
  }
}

// Type declaration for the window object
declare global {
  interface Window {
    electronAPI?: {
      database: {
        getConversations: () => Promise<any[]>
        getConversation: (id: string) => Promise<any | null>
        createConversation: (data: { title?: string; library: string; preview?: string }) => Promise<string>
        updateConversation: (id: string, updates: Record<string, any>) => Promise<void>
        deleteConversation: (id: string) => Promise<void>
        searchConversations: (query: string) => Promise<any[]>
        getMessages: (conversationId: string) => Promise<any[]>
        addMessage: (message: Record<string, any>) => Promise<string>
        updateMessage: (id: string, content: string) => Promise<void>
        deleteMessage: (id: string) => Promise<void>
        getSettings: () => Promise<any | null>
        saveSettings: (settings: Record<string, any>) => Promise<void>
        getSnippets: (library?: string) => Promise<any[]>
        addSnippet: (snippet: Record<string, any>) => Promise<string>
        deleteSnippet: (id: string) => Promise<void>
        searchSnippets: (query: string) => Promise<any[]>
        getFavorites: () => Promise<any[]>
        addFavorite: (favorite: Record<string, any>) => Promise<string>
        updateFavorite: (id: string, updates: Record<string, any>) => Promise<void>
        deleteFavorite: (id: string) => Promise<void>
        searchFavorites: (query: string) => Promise<any[]>
        indexMessage: (message: Record<string, any>) => Promise<void>
        searchRAG: (query: string, options?: { topK?: number; libraryId?: string }) => Promise<any[]>
        getRAGContext: (query: string, options?: { topK?: number; libraryId?: string }) => Promise<string>
        exportDatabase: () => Promise<Uint8Array>
        importDatabase: (data: Uint8Array) => Promise<void>
      }
      keychain: {
        get: (service: string, account: string) => Promise<string | null>
        set: (service: string, account: string, password: string) => Promise<void>
        delete: (service: string, account: string) => Promise<boolean>
        has: (service: string, account: string) => Promise<boolean>
      }
      fileSystem: {
        saveFile: (options: {
          defaultPath?: string
          filters?: Array<{ name: string; extensions: string[] }>
          data: string | Uint8Array
          encoding?: 'utf8' | 'binary'
        }) => Promise<{ success: boolean; path?: string; error?: string }>
        openFile: (options?: {
          filters?: Array<{ name: string; extensions: string[] }>
          encoding?: 'utf8' | 'binary'
        }) => Promise<{ success: boolean; data?: string | Uint8Array; path?: string; error?: string }>
        saveToPath: (path: string, data: string | Uint8Array, encoding?: 'utf8' | 'binary') => Promise<{ success: boolean; error?: string }>
        getDownloadsPath: () => Promise<string>
        exists: (path: string) => Promise<boolean>
        openInDefault: (path: string) => Promise<void>
        showInFolder: (path: string) => Promise<void>
      }
      shell: {
        openExternal: (url: string) => Promise<void>
        showItemInFolder: (path: string) => void
      }
      app: {
        getVersion: () => Promise<string>
        getPlatform: () => NodeJS.Platform
        isElectron: boolean
        getUserDataPath: () => Promise<string>
        quit: () => void
        reload: () => void
        toggleDevTools: () => void
        minimize: () => void
        maximize: () => void
        close: () => void
        isMaximized: () => Promise<boolean>
        toggleFullscreen: () => void
      }
      dialog: {
        showMessage: (options: {
          type?: 'none' | 'info' | 'error' | 'question' | 'warning'
          title?: string
          message: string
          detail?: string
          buttons?: string[]
        }) => Promise<{ response: number }>
        showError: (title: string, content: string) => Promise<void>
        confirm: (options: { title?: string; message: string; detail?: string }) => Promise<boolean>
      }
      clipboard: {
        writeText: (text: string) => void
        readText: () => Promise<string>
        writeImage: (dataURL: string) => void
      }
      events: {
        onMenuAction: (callback: (action: string) => void) => () => void
        onThemeChange: (callback: (theme: 'light' | 'dark') => void) => () => void
        onWindowFocus: (callback: (focused: boolean) => void) => () => void
        onUpdateStatus: (callback: (data: { status: string; data?: any }) => void) => () => void
      }
      update: {
        check: () => Promise<{ success: boolean; error?: string }>
        download: () => Promise<{ success: boolean; error?: string }>
        install: () => Promise<{ success: boolean; error?: string }>
        getInfo: () => Promise<{
          currentVersion: string
          updateAvailable: boolean
          latestVersion?: string
        }>
      }
    }
  }
}

export {}
