import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DockviewApi, SerializedDockview } from 'dockview-react'
import { addPanel, buildDefaultLayout, clearWorkspace, createPanelId, loadWorkspace, saveWorkspace } from './workspace'

const LAYOUT = { grid: { root: {}, width: 1, height: 1, orientation: 'HORIZONTAL' } } as unknown as SerializedDockview

function stubStorage(): Map<string, string> {
  const store = new Map<string, string>()
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key)
    }
  })
  return store
}

/** Minimal DockviewApi stand-in that records what the workspace asked it to add. */
function stubApi(): { api: DockviewApi; added: Array<Record<string, unknown>> } {
  const added: Array<Record<string, unknown>> = []
  const api = {
    addPanel: (options: Record<string, unknown>) => {
      added.push(options)
      return { id: options.id }
    }
  } as unknown as DockviewApi
  return { api, added }
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('workspace storage', () => {
  it('round-trips a layout', () => {
    stubStorage()
    saveWorkspace(LAYOUT)
    expect(loadWorkspace()).toEqual(LAYOUT)
  })

  it('returns null when nothing is stored', () => {
    stubStorage()
    expect(loadWorkspace()).toBeNull()
  })

  it('rejects a layout written by a different version', () => {
    const store = stubStorage()
    store.set('larp.workspace', JSON.stringify({ version: 99, layout: LAYOUT }))
    expect(loadWorkspace()).toBeNull()
  })

  it('survives malformed storage instead of throwing', () => {
    const store = stubStorage()
    store.set('larp.workspace', '{ not json')
    expect(loadWorkspace()).toBeNull()
  })

  it('survives a storage that throws on write', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error('quota exceeded')
        },
        removeItem: () => {}
      }
    })
    expect(() => saveWorkspace(LAYOUT)).not.toThrow()
  })

  it('clears the stored layout', () => {
    stubStorage()
    saveWorkspace(LAYOUT)
    clearWorkspace()
    expect(loadWorkspace()).toBeNull()
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
  it('opens a matrix and three quotes, one of them tabbed', () => {
    const { api, added } = stubApi()
    buildDefaultLayout(api)

    expect(added.map((panel) => panel.component)).toEqual(['matrix', 'quote', 'quote', 'quote'])
    expect(added[3]!.position).toEqual({ referencePanel: added[2]!.id })
  })
})
