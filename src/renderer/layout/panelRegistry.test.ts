import { describe, expect, it } from 'vitest'
import { getPanelDefinition, panelTitle, PANEL_DEFINITIONS } from './panelRegistry'

describe('panel registry', () => {
  it('exposes unique panel types', () => {
    const types = PANEL_DEFINITIONS.map((definition) => definition.type)
    expect(new Set(types).size).toBe(types.length)
  })

  it('gives every panel a display name, component and default config', () => {
    for (const definition of PANEL_DEFINITIONS) {
      expect(definition.displayName).toBeTruthy()
      // Lazy components are objects, not functions.
      expect(definition.component).toBeDefined()
      expect(definition.defaultConfig).toBeDefined()
    }
  })

  it('looks definitions up by type', () => {
    expect(getPanelDefinition('quote')?.displayName).toBe('QUOTE')
    expect(getPanelDefinition('nope')).toBeUndefined()
  })

  it('builds a tab title from the config', () => {
    expect(panelTitle('quote', { symbolId: 'tesr' })).toBe('QUOTE · TESR')
    expect(panelTitle('matrix', { sectors: [], showBreadth: true })).toBe('MATRIX · ALL')
    expect(panelTitle('matrix', { sectors: ['QUANT'], showBreadth: true })).toBe('MATRIX · QUANT')
  })

  it('falls back to the raw type for an unknown panel', () => {
    expect(panelTitle('mystery', {})).toBe('MYSTERY')
  })
})
