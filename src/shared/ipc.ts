/** IPC surface shared by the main process and the preload bridge. */

export const WindowChannel = {
  minimize: 'window:minimize',
  toggleMaximize: 'window:toggle-maximize',
  close: 'window:close',
  isMaximized: 'window:is-maximized',
  maximizedChanged: 'window:maximized-changed'
} as const

export type WindowChannelName = (typeof WindowChannel)[keyof typeof WindowChannel]

/** The API surfaced on `window.larp` in the renderer. */
export interface LarpWindowApi {
  minimize: () => void
  toggleMaximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  /** Subscribes to maximize-state changes. Returns an unsubscribe function. */
  onMaximizedChanged: (listener: (isMaximized: boolean) => void) => () => void
}

/** Mirrors `NodeJS.Platform`, redeclared so the renderer needs no Node types. */
export type Platform =
  | 'aix'
  | 'android'
  | 'darwin'
  | 'freebsd'
  | 'haiku'
  | 'linux'
  | 'openbsd'
  | 'sunos'
  | 'win32'
  | 'cygwin'
  | 'netbsd'

export interface LarpApi {
  platform: Platform
  window: LarpWindowApi
}
