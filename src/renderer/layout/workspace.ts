import type { DockviewApi, SerializedDockview } from 'dockview-react'
import { getPanelDefinition, panelTitle } from './panelRegistry'
import type { PanelParams } from './panelComponents'

const STORAGE_KEY = 'larp.workspace'
const VERSION = 1

interface StoredWorkspace {
  readonly version: number
  readonly layout: SerializedDockview
}

/** Step 7 moves this to a JSON file in the main process; localStorage is fine for now. */
export function saveWorkspace(layout: SerializedDockview): void {
  try {
    const payload: StoredWorkspace = { version: VERSION, layout }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (error) {
    console.warn('[workspace] could not save layout', error)
  }
}

export function loadWorkspace(): SerializedDockview | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const stored = JSON.parse(raw) as StoredWorkspace
    if (stored.version !== VERSION || !stored.layout) return null
    return stored.layout
  } catch (error) {
    console.warn('[workspace] could not read layout', error)
    return null
  }
}

export function clearWorkspace(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // A workspace we cannot clear is not worth failing a launch over.
  }
}

export function createPanelId(type: string): string {
  return `${type}-${Math.random().toString(36).slice(2, 8)}`
}

/** Adds one panel of `type`, optionally beside or tabbed with an existing panel. */
export function addPanel(
  api: DockviewApi,
  type: string,
  options: {
    readonly config?: unknown
    readonly referencePanel?: string
    readonly direction?: 'right' | 'below' | 'left' | 'above'
  } = {}
): string | null {
  const definition = getPanelDefinition(type)
  if (!definition) {
    console.warn(`[workspace] unknown panel type "${type}"`)
    return null
  }

  const config = options.config ?? definition.defaultConfig
  const id = createPanelId(type)
  // dockview stores params as a plain record; PanelParams is that record's shape.
  const params: Record<string, unknown> = { config } satisfies PanelParams

  api.addPanel({
    id,
    component: type,
    title: panelTitle(type, config),
    params,
    ...(options.referencePanel
      ? {
          position: {
            referencePanel: options.referencePanel,
            ...(options.direction ? { direction: options.direction } : {})
          }
        }
      : {})
  })

  return id
}

/**
 * The layout a fresh install opens with: the matrix on the left, the chart filling the
 * right, and quotes stacked beneath it — two of them tabbed together so the docking is
 * obvious immediately.
 */
export function buildDefaultLayout(api: DockviewApi): void {
  const matrix = addPanel(api, 'matrix')
  if (!matrix) return

  const chart = addPanel(api, 'chart', {
    config: { symbolId: 'tesr', intervalSeconds: 2, style: 'candles' },
    referencePanel: matrix,
    direction: 'right'
  })
  if (!chart) return

  const lower = addPanel(api, 'quote', {
    config: { symbolId: 'qvnx' },
    referencePanel: chart,
    direction: 'below'
  })
  if (!lower) return

  // No direction: joins the same group as a tab.
  addPanel(api, 'quote', { config: { symbolId: 'grvn' }, referencePanel: lower })
}
