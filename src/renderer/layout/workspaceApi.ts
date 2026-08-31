import type { DockviewApi } from 'dockview-react'

/**
 * The live dockview api, published by the panel host so non-React callers (the command
 * palette, keyboard shortcuts) can act on the workspace without prop-drilling.
 */
let current: DockviewApi | null = null

export function setWorkspaceApi(api: DockviewApi | null): void {
  current = api
}

export function getWorkspaceApi(): DockviewApi | null {
  return current
}
