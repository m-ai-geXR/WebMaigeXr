/**
 * Application Menu Configuration
 *
 * Defines the native menu bar for the maigeXR desktop application.
 * Provides platform-specific keyboard shortcuts and menu items.
 */

import { app, Menu, shell, BrowserWindow, MenuItemConstructorOptions } from 'electron'

const isMac = process.platform === 'darwin'

/**
 * Create the application menu
 */
export function createApplicationMenu(mainWindow: BrowserWindow): void {
  const template: MenuItemConstructorOptions[] = [
    // App menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              {
                label: 'Preferences...',
                accelerator: 'Cmd+,',
                click: () => {
                  mainWindow.webContents.send('menu:action', 'preferences')
                },
              },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),

    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New Conversation',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu:action', 'newConversation')
          },
        },
        { type: 'separator' },
        {
          label: 'Save Scene...',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('menu:action', 'saveScene')
          },
        },
        {
          label: 'Export Scene...',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => {
            mainWindow.webContents.send('menu:action', 'exportScene')
          },
        },
        { type: 'separator' },
        {
          label: 'Export Database...',
          click: () => {
            mainWindow.webContents.send('menu:action', 'exportDatabase')
          },
        },
        {
          label: 'Import Database...',
          click: () => {
            mainWindow.webContents.send('menu:action', 'importDatabase')
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },

    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' as const },
              { role: 'delete' as const },
              { role: 'selectAll' as const },
              { type: 'separator' as const },
              {
                label: 'Speech',
                submenu: [
                  { role: 'startSpeaking' as const },
                  { role: 'stopSpeaking' as const },
                ],
              },
            ]
          : [{ role: 'delete' as const }, { type: 'separator' as const }, { role: 'selectAll' as const }]),
        { type: 'separator' },
        {
          label: 'Find in Conversation...',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            mainWindow.webContents.send('menu:action', 'find')
          },
        },
      ],
    },

    // View menu
    {
      label: 'View',
      submenu: [
        {
          label: 'Chat',
          accelerator: 'CmdOrCtrl+1',
          click: () => {
            mainWindow.webContents.send('menu:action', 'viewChat')
          },
        },
        {
          label: 'Playground',
          accelerator: 'CmdOrCtrl+2',
          click: () => {
            mainWindow.webContents.send('menu:action', 'viewPlayground')
          },
        },
        {
          label: 'History',
          accelerator: 'CmdOrCtrl+3',
          click: () => {
            mainWindow.webContents.send('menu:action', 'viewHistory')
          },
        },
        {
          label: 'Snippets',
          accelerator: 'CmdOrCtrl+4',
          click: () => {
            mainWindow.webContents.send('menu:action', 'viewSnippets')
          },
        },
        {
          label: 'Favorites',
          accelerator: 'CmdOrCtrl+5',
          click: () => {
            mainWindow.webContents.send('menu:action', 'viewFavorites')
          },
        },
        { type: 'separator' },
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+B',
          click: () => {
            mainWindow.webContents.send('menu:action', 'toggleSidebar')
          },
        },
        {
          label: 'Toggle Console',
          accelerator: 'CmdOrCtrl+`',
          click: () => {
            mainWindow.webContents.send('menu:action', 'toggleConsole')
          },
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },

    // 3D Library menu
    {
      label: '3D Library',
      submenu: [
        {
          label: 'Babylon.js',
          type: 'radio',
          click: () => {
            mainWindow.webContents.send('menu:action', 'selectLibrary:babylonjs')
          },
        },
        {
          label: 'Three.js',
          type: 'radio',
          click: () => {
            mainWindow.webContents.send('menu:action', 'selectLibrary:threejs')
          },
        },
        {
          label: 'React Three Fiber',
          type: 'radio',
          click: () => {
            mainWindow.webContents.send('menu:action', 'selectLibrary:react-three-fiber')
          },
        },
        {
          label: 'A-Frame',
          type: 'radio',
          click: () => {
            mainWindow.webContents.send('menu:action', 'selectLibrary:aframe')
          },
        },
        { type: 'separator' },
        {
          label: 'Run Scene',
          accelerator: 'CmdOrCtrl+Enter',
          click: () => {
            mainWindow.webContents.send('menu:action', 'runScene')
          },
        },
        {
          label: 'Stop Scene',
          accelerator: 'Escape',
          click: () => {
            mainWindow.webContents.send('menu:action', 'stopScene')
          },
        },
      ],
    },

    // AI menu
    {
      label: 'AI',
      submenu: [
        {
          label: 'Send Message',
          accelerator: 'CmdOrCtrl+Return',
          click: () => {
            mainWindow.webContents.send('menu:action', 'sendMessage')
          },
        },
        {
          label: 'Regenerate Response',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            mainWindow.webContents.send('menu:action', 'regenerateResponse')
          },
        },
        { type: 'separator' },
        {
          label: 'Copy Last Response',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => {
            mainWindow.webContents.send('menu:action', 'copyLastResponse')
          },
        },
        {
          label: 'Copy Last Code',
          accelerator: 'CmdOrCtrl+Shift+X',
          click: () => {
            mainWindow.webContents.send('menu:action', 'copyLastCode')
          },
        },
        { type: 'separator' },
        {
          label: 'Clear Conversation',
          click: () => {
            mainWindow.webContents.send('menu:action', 'clearConversation')
          },
        },
      ],
    },

    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const },
            ]
          : [{ role: 'close' as const }]),
      ],
    },

    // Help menu
    {
      role: 'help',
      submenu: [
        {
          label: 'Documentation',
          click: async () => {
            await shell.openExternal('https://maigexr.com/docs')
          },
        },
        {
          label: 'Keyboard Shortcuts',
          accelerator: 'CmdOrCtrl+/',
          click: () => {
            mainWindow.webContents.send('menu:action', 'showShortcuts')
          },
        },
        { type: 'separator' },
        {
          label: 'View on GitHub',
          click: async () => {
            await shell.openExternal('https://github.com/maigexr/maigexr-desktop')
          },
        },
        {
          label: 'Report Issue',
          click: async () => {
            await shell.openExternal('https://github.com/maigexr/maigexr-desktop/issues')
          },
        },
        { type: 'separator' },
        {
          label: 'Check for Updates...',
          click: () => {
            mainWindow.webContents.send('menu:action', 'checkForUpdates')
          },
        },
        ...(isMac
          ? []
          : [
              { type: 'separator' as const },
              {
                label: 'About maigeXR',
                click: () => {
                  mainWindow.webContents.send('menu:action', 'about')
                },
              },
            ]),
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

/**
 * Create a context menu for the editor
 */
export function createEditorContextMenu(): Menu {
  const template: MenuItemConstructorOptions[] = [
    { role: 'cut' },
    { role: 'copy' },
    { role: 'paste' },
    { type: 'separator' },
    { role: 'selectAll' },
  ]

  return Menu.buildFromTemplate(template)
}

/**
 * Create a context menu for messages
 */
export function createMessageContextMenu(mainWindow: BrowserWindow, messageId: string): Menu {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'Copy Message',
      click: () => {
        mainWindow.webContents.send('menu:action', `copyMessage:${messageId}`)
      },
    },
    {
      label: 'Copy Code',
      click: () => {
        mainWindow.webContents.send('menu:action', `copyCode:${messageId}`)
      },
    },
    { type: 'separator' },
    {
      label: 'Add to Favorites',
      click: () => {
        mainWindow.webContents.send('menu:action', `addToFavorites:${messageId}`)
      },
    },
    {
      label: 'Send to Playground',
      click: () => {
        mainWindow.webContents.send('menu:action', `sendToPlayground:${messageId}`)
      },
    },
    { type: 'separator' },
    {
      label: 'Delete Message',
      click: () => {
        mainWindow.webContents.send('menu:action', `deleteMessage:${messageId}`)
      },
    },
  ]

  return Menu.buildFromTemplate(template)
}
