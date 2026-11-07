import { app, BrowserWindow, shell, ipcMain } from 'electron'
import * as path from 'path'
import * as url from 'url'

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null
let splashWindow: BrowserWindow | null = null

/** Keep the splash up long enough to be seen rather than flashing past. */
const SPLASH_MIN_DURATION_MS = 2200

/**
 * Hard limit. If the app window never reports ready — a slow or dead dev
 * server, a failed bundle — reveal it anyway rather than stranding the user on
 * the splash.
 */
const SPLASH_MAX_DURATION_MS = 20000

/** Set when the splash has actually painted, not when it was created. */
let splashShownAt = 0
let splashFinished = false
let splashSafetyTimer: NodeJS.Timeout | null = null

/**
 * A finish that arrived before the splash was visible.
 *
 * The app window can become ready in a couple of hundred milliseconds against a
 * warm dev server, well before the splash has painted. Measuring the minimum
 * display time from window *creation* would then close the splash almost as soon
 * as it appeared - or let it appear after the app window. So an early finish is
 * parked here and replayed once the splash is actually on screen.
 */
let pendingFinish: { force: boolean } | null = null

function createSplashWindow(): void {
  splashWindow = new BrowserWindow({
    width: 640,
    height: 420,
    center: true,
    frame: false,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: '#0A0A0A',
    roundedCorners: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'splash-preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      // The splash pulls Three.js from a CDN, like the iOS and Android
      // splashes do, so it needs ordinary web access and nothing more.
      webSecurity: true,
    },
  })

  splashWindow.loadFile(path.join(__dirname, '../splash.html'))

  splashWindow.once('ready-to-show', () => {
    splashWindow?.show()
    splashShownAt = Date.now()
    console.log('[splash] shown')

    if (pendingFinish) {
      const opts = pendingFinish
      pendingFinish = null
      closeSplashAndRevealApp(opts)
    }
  })

  splashWindow.on('closed', () => {
    splashWindow = null
  })

  splashSafetyTimer = setTimeout(() => {
    console.warn('[splash] app window never reported ready; revealing it anyway')
    finishSplash({ force: true })
  }, SPLASH_MAX_DURATION_MS)
}

function setSplashStatus(message: string): void {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('splash:status', message)
  }
}

/**
 * Request the end of the splash. Runs at most once.
 *
 * If the splash has not painted yet the request is parked and replayed from its
 * ready-to-show handler, so the minimum display time is always measured against
 * real visibility. `force` (the safety timeout, or a click to skip) goes through
 * immediately either way.
 */
function finishSplash({ force = false }: { force?: boolean } = {}): void {
  if (splashFinished) return

  const splashAlive = splashWindow !== null && !splashWindow.isDestroyed()
  if (!force && splashAlive && splashShownAt === 0) {
    console.log('[splash] app ready before the splash painted; deferring')
    pendingFinish = { force }
    return
  }

  splashFinished = true
  closeSplashAndRevealApp({ force })
}

/** Wait out any remaining minimum display time, then swap splash for app. */
function closeSplashAndRevealApp({ force = false }: { force?: boolean } = {}): void {
  splashFinished = true

  if (splashSafetyTimer) {
    clearTimeout(splashSafetyTimer)
    splashSafetyTimer = null
  }

  const visibleFor = splashShownAt === 0 ? 0 : Date.now() - splashShownAt
  const wait = force ? 0 : Math.max(0, SPLASH_MIN_DURATION_MS - visibleFor)

  setSplashStatus('Ready')
  console.log(
    `[splash] finishing (${force ? 'skipped' : 'app ready'}); ` +
    `visible ${visibleFor}ms, waiting a further ${wait}ms`
  )

  setTimeout(() => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close()
    }
    splashWindow = null

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
      mainWindow.focus()
    }
  }, wait)
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0a0a0f',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false,
    },
    show: false,
  })

  if (isDev) {
    // Port 3000 is a popular default; another dev server may already own it.
    // ELECTRON_DEV_URL lets the window point elsewhere without a code change.
    mainWindow.loadURL(process.env.ELECTRON_DEV_URL || 'http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, '../../out/index.html'),
        protocol: 'file:',
        slashes: true,
      })
    )
  }

  setSplashStatus(isDev ? 'Starting dev server\u2026' : 'Loading interface\u2026')

  mainWindow.webContents.once('did-finish-load', () => {
    setSplashStatus('Preparing workspace\u2026')
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    // Dev-server hiccups fire this repeatedly; say so rather than sitting silent.
    console.error(`[main] window failed to load: ${errorDescription} (${errorCode})`)
    setSplashStatus('Still loading\u2026')
  })

  // The splash owns the reveal, so the window stays hidden until it says go.
  mainWindow.once('ready-to-show', () => {
    finishSplash()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url: openUrl }) => {
    shell.openExternal(openUrl)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createSplashWindow()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Click-to-skip from the splash, mirroring tap-to-skip on mobile.
ipcMain.on('splash:dismiss', () => {
  finishSplash({ force: true })
})

ipcMain.handle('get-app-version', () => app.getVersion())
ipcMain.handle('get-platform', () => process.platform)
