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

/** Resizes the group a panel lives in. Panels themselves carry no size. */
export function setGroupHeight(api: DockviewApi, panelId: string, height: number): void {
  api.getPanel(panelId)?.group.api.setSize({ height })
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
    /** Starting height of the panel's group, in pixels. */
    readonly height?: number
    readonly width?: number
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
    ...(options.height === undefined ? {} : { initialHeight: options.height }),
    ...(options.width === undefined ? {} : { initialWidth: options.width }),
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
 * The layout a fresh install opens with. Dense on purpose (design principle 2): the
 * tape along the top, book and matrix down the left, chart and graph carrying the
 * middle, alerts and console stacked on the right.
 */
export function buildDefaultLayout(api: DockviewApi): void {
  const tape = addPanel(api, 'ticker')
  if (!tape) return

  const book = addPanel(api, 'bignumber', { referencePanel: tape, direction: 'below' })
  if (!book) return

  const matrix = addPanel(api, 'matrix', { referencePanel: book, direction: 'below' })
  if (!matrix) return

  const chart = addPanel(api, 'chart', {
    config: { symbolId: 'tesr', intervalSeconds: 2, style: 'candles' },
    referencePanel: book,
    direction: 'right'
  })
  if (!chart) return

  const graph = addPanel(api, 'graph', { referencePanel: chart, direction: 'below' })
  if (!graph) return

  const alerts = addPanel(api, 'alerts', { referencePanel: chart, direction: 'right' })
  if (!alerts) return

  const console = addPanel(api, 'console', { referencePanel: alerts, direction: 'below' })
  if (!console) return

  // No direction: joins the same group as a tab.
  addPanel(api, 'heatmap', { referencePanel: graph })

  // Sizing happens after every panel exists: dockview renormalises group sizes on each
  // insert, so heights given at creation time do not survive the panels added after them.
  // Order matters: a group can only grow into space its siblings have given up, so the
  // matrix is shrunk first and the graph then claims what that released.
  setGroupHeight(api, tape, 46)
  setGroupHeight(api, matrix, 260)
  setGroupHeight(api, graph, 320)

  // The graph shares a group with the heatmap and should be the tab on top.
  api.getPanel(graph)?.api.setActive()
}
