import { contextBridge, ipcRenderer } from 'electron'
import { WindowChannel, type LarpApi } from '../shared/ipc'

/**
 * The only bridge between renderer and main. Nothing from Node or Electron is
 * exposed directly — the renderer gets these narrow functions and nothing else.
 */
const api: LarpApi = {
  platform: process.platform,
  window: {
    minimize: () => ipcRenderer.send(WindowChannel.minimize),
    toggleMaximize: () => ipcRenderer.send(WindowChannel.toggleMaximize),
    close: () => ipcRenderer.send(WindowChannel.close),
    isMaximized: () => ipcRenderer.invoke(WindowChannel.isMaximized),
    onMaximizedChanged: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, isMaximized: boolean): void =>
        listener(isMaximized)
      ipcRenderer.on(WindowChannel.maximizedChanged, handler)
      return () => {
        ipcRenderer.off(WindowChannel.maximizedChanged, handler)
      }
    }
  }
}

contextBridge.exposeInMainWorld('larp', api)
