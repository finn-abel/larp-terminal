import { join } from 'node:path'
import { app, shell, BrowserWindow } from 'electron'
import { broadcastMaximizeState, registerWindowControls } from './windowControls'
import { registerDevShortcuts } from './devShortcuts'

const MIN_WIDTH = 1280
const MIN_HEIGHT = 800
const BACKGROUND = '#05070a'

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: MIN_WIDTH,
    height: MIN_HEIGHT,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    show: false,
    frame: false,
    backgroundColor: BACKGROUND,
    // No `titleBarStyle` on macOS: 'hidden' keeps the traffic lights and reserves a strip
    // for them, which collides with our own titlebar. `frame: false` alone is chromeless.
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  window.once('ready-to-show', () => window.show())

  // A renderer crash otherwise just makes the window vanish with no explanation.
  window.webContents.on('render-process-gone', (_event, details) => {
    console.error('[main] renderer gone:', details.reason, 'exitCode', details.exitCode)
  })
  window.on('unresponsive', () => console.error('[main] renderer unresponsive'))

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  broadcastMaximizeState(window)

  const rendererUrl = process.env['ELECTRON_RENDERER_URL']
  if (!app.isPackaged && rendererUrl) {
    registerDevShortcuts(window)
    void window.loadURL(rendererUrl)
  } else {
    void window.loadFile(join(import.meta.dirname, '../renderer/index.html'))
  }

  return window
}

void app.whenReady().then(() => {
  app.setAppUserModelId('com.larpterminal.app')

  registerWindowControls()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
