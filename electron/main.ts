/**
 * Electron Main Process
 *
 * Entry point for the maigeXR desktop application.
 * Handles window management, IPC communication, and native integrations.
 */

import { app, BrowserWindow, shell, nativeTheme } from 'electron'
import path from 'path'
import { setupIpcHandlers } from './ipc-handlers'
import { createApplicationMenu } from './menu'
import { WindowStateManager } from './window-state'
import { initAutoUpdater } from './auto-updater'

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit()
}

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null

// Development mode check
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// Window state manager for persisting window size/position
let windowStateManager: WindowStateManager

async function createWindow(): Promise<void> {
  // Initialize window state manager
  windowStateManager = new WindowStateManager({
    defaultWidth: 1400,
    defaultHeight: 900,
    minWidth: 800,
    minHeight: 600
  })

  const windowState = windowStateManager.getState()

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 800,
    minHeight: 600,
    show: false, // Show when ready to prevent flashing
    backgroundColor: '#0a0a0f', // Cyberpunk black background
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    frame: process.platform !== 'darwin',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Required for better-sqlite3
      webSecurity: true,
      allowRunningInsecureContent: false
    },
    icon: getIconPath()
  })

  // Restore maximized state
  if (windowState.isMaximized) {
    mainWindow.maximize()
  }

  // Track window state changes
  windowStateManager.track(mainWindow)

  // Load the app
  if (isDev) {
    // In development, load from Next.js dev server
    await mainWindow.loadURL('http://localhost:3000')
    // Open DevTools in development
    mainWindow.webContents.openDevTools()
  } else {
    // In production, load the exported static files
    await mainWindow.loadFile(path.join(__dirname, '../out/index.html'))
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open external URLs in the default browser
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Setup application menu
  createApplicationMenu(mainWindow)

  // Setup IPC handlers
  setupIpcHandlers()
}

/**
 * Get the appropriate icon path based on platform
 */
function getIconPath(): string {
  const iconBasePath = path.join(__dirname, '../build')

  switch (process.platform) {
    case 'win32':
      return path.join(iconBasePath, 'icon.ico')
    case 'darwin':
      return path.join(iconBasePath, 'icon.icns')
    default:
      return path.join(iconBasePath, 'icon.png')
  }
}

// App lifecycle events
app.on('ready', async () => {
  await createWindow()

  // Set dark mode based on system preference
  nativeTheme.themeSource = 'dark' // Force dark mode for cyberpunk theme

  // Initialize auto-updater in production
  if (!isDev && mainWindow) {
    initAutoUpdater(mainWindow)
  }
})

app.on('window-all-closed', () => {
  // On macOS, keep the app running until explicitly quit
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', async () => {
  // On macOS, re-create window when dock icon is clicked
  if (mainWindow === null) {
    await createWindow()
  }
})

// Security: Prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    // Only allow navigation within the app
    const parsedUrl = new URL(url)
    if (isDev && parsedUrl.hostname === 'localhost') {
      return // Allow localhost in dev
    }
    if (!url.startsWith('file://')) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })
})

// Handle certificate errors (development only)
if (isDev) {
  app.on('certificate-error', (event, _webContents, url, _error, _certificate, callback) => {
    if (url.startsWith('https://localhost')) {
      event.preventDefault()
      callback(true)
    } else {
      callback(false)
    }
  })
}

// Export for testing
export { mainWindow, createWindow }
