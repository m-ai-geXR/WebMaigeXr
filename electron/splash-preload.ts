import { contextBridge, ipcRenderer } from 'electron'

/**
 * Preload for the splash window only.
 *
 * The splash is a separate BrowserWindow from the app, and it must not get the
 * app's preload surface, so it has its own narrow bridge: report status, show
 * the version, and ask to be dismissed early when the user clicks.
 *
 * Dismissal is only a *request*. The main process decides when the splash
 * actually closes, so that a failed CDN fetch or a stalled dev server cannot
 * leave the user looking at a splash forever.
 */
contextBridge.exposeInMainWorld('maigexrSplash', {
  /** Ask the main process to finish the splash early (click to skip). */
  dismiss: () => ipcRenderer.send('splash:dismiss'),

  /** Subscribe to status lines pushed from the main process. */
  onStatus: (callback: (message: string) => void) => {
    ipcRenderer.on('splash:status', (_event, message: string) => callback(message))
  },

  /** Shown in the footer; purely cosmetic. */
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
})
