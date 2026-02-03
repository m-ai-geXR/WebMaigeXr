/**
 * Auto Updater Module
 *
 * Handles automatic updates for the maigeXR desktop application.
 * Uses electron-updater for checking and applying updates from GitHub releases.
 */

import { BrowserWindow, dialog, app } from 'electron'

// Lazy-load electron-updater to avoid fs-extra issues on startup
let autoUpdater: any = null
let log: any = console

async function initModules() {
  if (autoUpdater) return true

  try {
    const updaterModule = await import('electron-updater')
    autoUpdater = updaterModule.autoUpdater

    try {
      const logModule = await import('electron-log')
      log = logModule.default
      autoUpdater.logger = log
      log.transports.file.level = 'info'
    } catch (e) {
      console.warn('electron-log not available, using console')
    }

    // Don't auto-download updates - let user decide
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true

    return true
  } catch (error) {
    console.error('Failed to load electron-updater:', error)
    return false
  }
}

// Store reference to main window for notifications
let mainWindow: BrowserWindow | null = null

/**
 * Initialize the auto-updater
 * @param window The main browser window for notifications
 */
export async function initAutoUpdater(window: BrowserWindow): Promise<void> {
  mainWindow = window

  const initialized = await initModules()
  if (!initialized) {
    console.warn('Auto-updater could not be initialized')
    return
  }

  // Check for updates on startup (after a short delay)
  setTimeout(() => {
    checkForUpdates()
  }, 10000) // Wait 10 seconds after app start

  // Set up event handlers
  setupEventHandlers()
}

/**
 * Check for updates manually
 */
export async function checkForUpdates(): Promise<void> {
  if (!autoUpdater) {
    const initialized = await initModules()
    if (!initialized) return
  }

  try {
    log.info('Checking for updates...')
    await autoUpdater.checkForUpdates()
  } catch (error) {
    log.error('Error checking for updates:', error)
  }
}

/**
 * Download the available update
 */
export async function downloadUpdate(): Promise<void> {
  if (!autoUpdater) return

  try {
    log.info('Downloading update...')
    await autoUpdater.downloadUpdate()
  } catch (error) {
    log.error('Error downloading update:', error)
  }
}

/**
 * Install the update and restart the app
 */
export function installUpdate(): void {
  if (!autoUpdater) return
  autoUpdater.quitAndInstall(false, true)
}

/**
 * Set up auto-updater event handlers
 */
function setupEventHandlers(): void {
  if (!autoUpdater) return

  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...')
    sendStatusToWindow('checking-for-update')
  })

  autoUpdater.on('update-available', (info: any) => {
    log.info('Update available:', info.version)
    sendStatusToWindow('update-available', info)

    // Show dialog asking user if they want to download
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `A new version (${info.version}) is available.`,
        detail: `Would you like to download it now?\n\nRelease notes:\n${info.releaseNotes || 'No release notes available.'}`,
        buttons: ['Download', 'Later'],
        defaultId: 0,
        cancelId: 1
      }).then(({ response }) => {
        if (response === 0) {
          downloadUpdate()
        }
      })
    }
  })

  autoUpdater.on('update-not-available', (info: any) => {
    log.info('Update not available. Current version is up to date.')
    sendStatusToWindow('update-not-available', info)
  })

  autoUpdater.on('error', (err: Error) => {
    log.error('Error in auto-updater:', err)
    sendStatusToWindow('error', { message: err.message })
  })

  autoUpdater.on('download-progress', (progressObj: any) => {
    const logMessage = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`
    log.info(logMessage)
    sendStatusToWindow('download-progress', progressObj)
  })

  autoUpdater.on('update-downloaded', (info: any) => {
    log.info('Update downloaded:', info.version)
    sendStatusToWindow('update-downloaded', info)

    // Show dialog asking user if they want to install now
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: `Version ${info.version} has been downloaded.`,
        detail: 'The update will be installed when you quit the application. Would you like to restart now?',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1
      }).then(({ response }) => {
        if (response === 0) {
          installUpdate()
        }
      })
    }
  })
}

/**
 * Send update status to the renderer process
 */
function sendStatusToWindow(status: string, data?: any): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { status, data })
  }
}

/**
 * Get update information for the renderer
 */
export async function getUpdateInfo(): Promise<{
  currentVersion: string
  updateAvailable: boolean
  latestVersion?: string
}> {
  const currentVersion = app.getVersion()

  if (!autoUpdater) {
    const initialized = await initModules()
    if (!initialized) {
      return { currentVersion, updateAvailable: false }
    }
  }

  try {
    const result = await autoUpdater.checkForUpdates()
    if (result && result.updateInfo) {
      return {
        currentVersion,
        updateAvailable: result.updateInfo.version !== currentVersion,
        latestVersion: result.updateInfo.version
      }
    }
  } catch (error) {
    log.error('Error getting update info:', error)
  }

  return {
    currentVersion,
    updateAvailable: false
  }
}
