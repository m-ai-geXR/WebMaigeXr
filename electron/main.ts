/**
 * Electron Main Process
 *
 * Entry point for the maigeXR desktop application.
 * Handles window management, IPC communication, and native integrations.
 */

import { app, BrowserWindow, shell, nativeTheme, dialog, protocol, net } from 'electron'
import path from 'path'
import { setupIpcHandlers } from './ipc-handlers'
import { createApplicationMenu } from './menu'
import { WindowStateManager } from './window-state'

// Register custom protocol for serving static files
function registerAppProtocol() {
  protocol.handle('app', (request) => {
    // Parse the URL - handle both app://./path and app:///path formats
    let urlPath = request.url.replace('app://', '')

    // Handle ./ prefix
    if (urlPath.startsWith('./')) {
      urlPath = urlPath.slice(2)
    }
    // Handle leading slashes
    while (urlPath.startsWith('/')) {
      urlPath = urlPath.slice(1)
    }

    // Build full path to the file in out/ directory
    const fullPath = path.join(app.getAppPath(), 'out', urlPath)

    console.log('Protocol request:', request.url, '->', fullPath)

    // Return the file
    return net.fetch('file://' + fullPath)
  })
}

// Register app:// as a privileged scheme (must be done before app is ready)
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      // These are critical for localStorage and other web APIs
      allowServiceWorkers: true,
    }
  }
])

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null
let splashWindow: BrowserWindow | null = null

// Development mode check - only use dev server if explicitly in development AND not packaged
const isDev = process.env.NODE_ENV === 'development' && !app.isPackaged

// Window state manager for persisting window size/position
let windowStateManager: WindowStateManager

/**
 * Create and show the splash screen
 */
function createSplashWindow(): BrowserWindow {
  const splash = new BrowserWindow({
    width: 400,
    height: 500,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  })

  // Load splash screen - __dirname is electron/dist/, splash.html is in electron/
  const splashPath = path.join(__dirname, '..', 'splash.html')
  console.log('Loading splash from:', splashPath)
  splash.loadFile(splashPath)

  splash.center()
  splash.show()

  return splash
}

// Global error handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  dialog.showErrorBox('Error', `An unexpected error occurred: ${error.message}`)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
})

async function createWindow(): Promise<void> {
  try {
    // Show splash screen first (only in production)
    if (!isDev) {
      splashWindow = createSplashWindow()
    }

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
      show: false,  // Hidden until ready, splash shows instead
      backgroundColor: '#0a0a0f',
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      frame: true, // Always show frame for stability
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        webSecurity: true,
        allowRunningInsecureContent: false
      }
    })

    // Restore maximized state
    if (windowState.isMaximized) {
      mainWindow.maximize()
    }

    // Track window state changes
    windowStateManager.track(mainWindow)

    // Load the app
    if (isDev) {
      console.log('Development mode: loading from localhost:3000')
      await mainWindow.loadURL('http://localhost:3000')
      mainWindow.webContents.openDevTools()
    } else {
      // In production, use custom app:// protocol to serve static files
      // This ensures /_next/ paths resolve correctly
      console.log('Production mode: loading via app:// protocol')
      console.log('App path:', app.getAppPath())
      console.log('__dirname:', __dirname)

      await mainWindow.loadURL('app://./index.html')
    }

    // Show window when ready and close splash
    mainWindow.once('ready-to-show', () => {
      console.log('Window ready to show')

      // Small delay for smoother transition
      setTimeout(() => {
        // Close splash screen
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.close()
          splashWindow = null
        }

        // Show main window
        mainWindow?.show()
        mainWindow?.focus()
      }, 500)
    })

    // Fallback: close splash and show main after timeout
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close()
        splashWindow = null
      }
      if (mainWindow && !mainWindow.isVisible()) {
        console.log('Forcing window to show after timeout')
        mainWindow.show()
        mainWindow.focus()
      }
    }, 5000)

    // Handle render process crashes
    mainWindow.webContents.on('render-process-gone', (_event, details) => {
      console.error('Render process gone:', details)
      dialog.showErrorBox('Error', `The application crashed: ${details.reason}`)
    })

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
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

  } catch (error) {
    console.error('Failed to create window:', error)
    dialog.showErrorBox('Startup Error', `Failed to start maigeXR: ${error}`)
    app.quit()
  }
}

// Handle second instance
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

// App lifecycle events
app.whenReady().then(async () => {
  try {
    // Register custom protocol for static files
    if (!isDev) {
      registerAppProtocol()
    }

    await createWindow()

    // Set dark mode
    nativeTheme.themeSource = 'dark'

    // Initialize auto-updater in production (with error handling)
    if (!isDev && mainWindow && app.isPackaged) {
      try {
        const { initAutoUpdater } = await import('./auto-updater')
        initAutoUpdater(mainWindow)
      } catch (error) {
        console.error('Failed to initialize auto-updater:', error)
      }
    }
  } catch (error) {
    console.error('App ready error:', error)
    dialog.showErrorBox('Startup Error', `Failed to initialize: ${error}`)
    app.quit()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', async () => {
  if (mainWindow === null) {
    await createWindow()
  }
})

// Export for testing
export { mainWindow, createWindow }
