import { BrowserWindow, ipcMain } from 'electron'
import { WindowChannel } from '../shared/ipc'

/**
 * Registers the window-control IPC handlers. Every handler resolves its target
 * window from the sender, so a request can only ever act on the window it came from.
 */
export function registerWindowControls(): void {
  ipcMain.on(WindowChannel.minimize, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.on(WindowChannel.toggleMaximize, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return
    if (window.isMaximized()) {
      window.unmaximize()
      return
    }
    window.maximize()
  })

  ipcMain.on(WindowChannel.close, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  ipcMain.handle(WindowChannel.isMaximized, (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false
  })
}

/** Pushes maximize-state changes to the renderer so the titlebar icon stays in sync. */
export function broadcastMaximizeState(window: BrowserWindow): void {
  const send = (isMaximized: boolean): void => {
    if (window.isDestroyed()) return
    window.webContents.send(WindowChannel.maximizedChanged, isMaximized)
  }

  window.on('maximize', () => send(true))
  window.on('unmaximize', () => send(false))
  window.on('enter-full-screen', () => send(true))
  window.on('leave-full-screen', () => send(false))
}
