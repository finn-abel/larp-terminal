import type { BrowserWindow } from 'electron'

const isMac = process.platform === 'darwin'

/**
 * Dev-only keyboard shortcuts. The window is frameless and menu-less, so reload and
 * devtools need to be wired up by hand.
 */
export function registerDevShortcuts(window: BrowserWindow): void {
  window.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return
    const modifier = isMac ? input.meta : input.control

    if (input.key === 'F12' || (modifier && input.alt && input.key.toLowerCase() === 'i')) {
      window.webContents.toggleDevTools()
      event.preventDefault()
      return
    }

    if (modifier && input.key.toLowerCase() === 'r') {
      window.webContents.reload()
      event.preventDefault()
    }
  })
}
