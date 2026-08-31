/** IPC surface shared by the main process and the preload bridge. */

export const WindowChannel = {
  minimize: 'window:minimize',
  toggleMaximize: 'window:toggle-maximize',
  close: 'window:close',
  isMaximized: 'window:is-maximized',
  maximizedChanged: 'window:maximized-changed'
} as const

export type WindowChannelName = (typeof WindowChannel)[keyof typeof WindowChannel]

export const WorkspaceChannel = {
  read: 'workspace:read',
  write: 'workspace:write',
  switch: 'workspace:switch',
  remove: 'workspace:remove'
} as const

/** Serialized dockview layout. The main process treats it as opaque JSON. */
export type WorkspaceLayout = unknown

export interface WorkspaceFile {
  readonly version: number
  readonly active: string
  readonly workspaces: Readonly<Record<string, WorkspaceLayout>>
}

export interface WorkspaceSnapshot {
  readonly active: string
  readonly names: readonly string[]
  readonly layout: WorkspaceLayout | null
}

export interface LarpWorkspaceApi {
  /** Reads the active workspace and the list of saved names. */
  read: () => Promise<WorkspaceSnapshot>
  /** Saves a layout under a name, making it active. */
  write: (name: string, layout: WorkspaceLayout) => Promise<WorkspaceSnapshot>
  /** Switches to a saved workspace. */
  switch: (name: string) => Promise<WorkspaceSnapshot>
  remove: (name: string) => Promise<WorkspaceSnapshot>
}

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
  workspace: LarpWorkspaceApi
}
