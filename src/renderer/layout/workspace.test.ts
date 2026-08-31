import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DockviewApi, SerializedDockview } from 'dockview-react'
import type { WorkspaceSnapshot } from '@shared/ipc'
import {
  addPanel,
  buildDefaultLayout,
  createPanelId,
  readWorkspace,
  removeWorkspace,
  saveWorkspace,
  switchWorkspace
} from './workspace'

const LAYOUT = { grid: { root: {}, width: 1, height: 1, orientation: 'HORIZONTAL' } } as unknown as SerializedDockview

const SNAPSHOT: WorkspaceSnapshot = { active: 'default', names: ['default'], layout: LAYOUT }

/** Stubs the preload bridge the renderer talks to. */
function stubBridge(overrides: Partial<Record<keyof WorkspaceSnapshot | string, unknown>> = {}) {
  const calls: Array<[string, unknown[]]> = []
  const handler =
    (name: string, result: unknown = SNAPSHOT) =>
    (...args: unknown[]) => {
      calls.push([name, args])
      return result instanceof Error ? Promise.reject(result) : Promise.resolve(result)
    }

  vi.stubGlobal('window', {
    larp: {
      workspace: {
        read: handler('read', overrides.read),
        write: handler('write', overrides.write),
        switch: handler('switch', overrides.switch),
        remove: handler('remove', overrides.remove)
      }
    }
  })
  return calls
}

/** Minimal DockviewApi stand-in that records what the workspace asked it to add. */
function stubApi(): {
  api: DockviewApi
  added: Array<Record<string, unknown>>
  sized: Array<{ id: string; height?: number }>
  activated: string[]
} {
  const added: Array<Record<string, unknown>> = []
  const sized: Array<{ id: string; height?: number }> = []
  const activated: string[] = []

  const api = {
    addPanel: (options: Record<string, unknown>) => {
      added.push(options)
      return { id: options.id }
    },
    getPanel: (id: string) => ({
      api: { setActive: () => activated.push(id) },
      group: {
        api: { setSize: (size: { height?: number }) => sized.push({ id, height: size.height }) }
      }
    })
  } as unknown as DockviewApi

  return { api, added, sized, activated }
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('workspace storage', () => {
  it('reads the active workspace over the bridge', async () => {
    const calls = stubBridge()
    await expect(readWorkspace()).resolves.toEqual(SNAPSHOT)
    expect(calls[0]![0]).toBe('read')
  })

  it('falls back to an empty default when the bridge fails', async () => {
    stubBridge({ read: new Error('no ipc') })
    await expect(readWorkspace()).resolves.toEqual({
      active: 'default',
      names: [],
      layout: null
    })
  })

  it('saves a layout under a name', async () => {
    const calls = stubBridge()
    await saveWorkspace('trading', LAYOUT)
    expect(calls[0]).toEqual(['write', ['trading', LAYOUT]])
  })

  it('returns null rather than throwing when a save fails', async () => {
    stubBridge({ write: new Error('disk full') })
    await expect(saveWorkspace('trading', LAYOUT)).resolves.toBeNull()
  })

  it('switches and removes by name', async () => {
    const calls = stubBridge()
    await switchWorkspace('night')
    await removeWorkspace('night')
    expect(calls.map(([name]) => name)).toEqual(['switch', 'remove'])
  })

  it('survives a failing switch or remove', async () => {
    stubBridge({ switch: new Error('gone'), remove: new Error('gone') })
    await expect(switchWorkspace('x')).resolves.toBeNull()
    await expect(removeWorkspace('x')).resolves.toBeNull()
  })
})

describe('panel ids', () => {
  it('prefixes the type and stays unique', () => {
    const ids = Array.from({ length: 200 }, () => createPanelId('quote'))
    expect(ids.every((id) => id.startsWith('quote-'))).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('addPanel', () => {
  it('adds a known panel with its title and config', () => {
    const { api, added } = stubApi()
    const id = addPanel(api, 'quote', { config: { symbolId: 'tesr' } })

    expect(id).toMatch(/^quote-/)
    expect(added).toHaveLength(1)
    expect(added[0]!.component).toBe('quote')
    expect(added[0]!.title).toBe('QUOTE · TESR')
    expect(added[0]!.params).toEqual({ config: { symbolId: 'tesr' } })
  })

  it('falls back to the default config', () => {
    const { api, added } = stubApi()
    addPanel(api, 'matrix')
    expect(added[0]!.params).toEqual({ config: { sectors: [], showBreadth: true } })
  })

  it('refuses an unknown panel type', () => {
    const { api, added } = stubApi()
    expect(addPanel(api, 'no-such-type')).toBeNull()
    expect(added).toHaveLength(0)
  })

  it('positions a panel relative to another', () => {
    const { api, added } = stubApi()
    addPanel(api, 'quote', { referencePanel: 'matrix-1', direction: 'right' })
    expect(added[0]!.position).toEqual({ referencePanel: 'matrix-1', direction: 'right' })
  })

  it('omits direction so the panel joins as a tab', () => {
    const { api, added } = stubApi()
    addPanel(api, 'quote', { referencePanel: 'quote-1' })
    expect(added[0]!.position).toEqual({ referencePanel: 'quote-1' })
  })
})

describe('default layout', () => {
  it('opens the full terminal, with the heatmap tabbed behind the graph', () => {
    const { api, added } = stubApi()
    buildDefaultLayout(api)

    expect(added.map((panel) => panel.component)).toEqual([
      'ticker',
      'bignumber',
      'matrix',
      'chart',
      'graph',
      'alerts',
      'console',
      'heatmap'
    ])
    expect(added.at(-1)!.position).toEqual({ referencePanel: added[4]!.id })
  })

  it('sizes the tape as a strip and gives the graph room, after every panel exists', () => {
    const { api, added, sized } = stubApi()
    buildDefaultLayout(api)

    expect(sized).toEqual([
      { id: added[0]!.id, height: 46 },
      { id: added[2]!.id, height: 230 },
      { id: added[4]!.id, height: 420 }
    ])
  })

  it('leaves the graph on top of its tab group', () => {
    const { api, added, activated } = stubApi()
    buildDefaultLayout(api)

    expect(activated).toEqual([added[4]!.id])
  })

  it('passes a height through as initialHeight', () => {
    const { api, added } = stubApi()
    addPanel(api, 'quote', { height: 120 })

    expect(added[0]!.initialHeight).toBe(120)
  })

  it('omits sizing when none is asked for', () => {
    const { api, added } = stubApi()
    addPanel(api, 'quote')

    expect(added[0]).not.toHaveProperty('initialHeight')
  })
})
