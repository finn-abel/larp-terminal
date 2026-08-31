import { describe, expect, it, vi } from 'vitest'
import { buildCommands, matchCommands, type CommandActions } from './commands'

const actions = (): CommandActions => ({
  spawnPanel: vi.fn(),
  openSymbol: vi.fn(),
  forceRegime: vi.fn(),
  reseed: vi.fn(),
  resetWorkspace: vi.fn(),
  toggleCrt: vi.fn()
})

const commands = buildCommands()

describe('buildCommands', () => {
  it('offers a command for every registered panel', () => {
    const panels = commands.filter((command) => command.group === 'PANEL')
    expect(panels.length).toBeGreaterThanOrEqual(8)
  })

  it('offers a command for every symbol and regime', () => {
    expect(commands.filter((command) => command.group === 'SYMBOL')).toHaveLength(12)
    expect(commands.filter((command) => command.group === 'REGIME')).toHaveLength(4)
  })

  it('gives every command a unique code', () => {
    const codes = commands.map((command) => command.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('spawns a panel through the injected action', () => {
    const injected = actions()
    commands.find((command) => command.code === 'CHART')!.run(injected)
    expect(injected.spawnPanel).toHaveBeenCalledWith('chart')
  })

  it('uses the panel display name as its code, not a truncated type', () => {
    const codes = commands.filter((command) => command.group === 'PANEL').map((c) => c.code)
    expect(codes).toContain('HEATMAP')
    expect(codes).toContain('BOOK')
    expect(codes.every((code) => code === code.toUpperCase())).toBe(true)
  })

  it('forces a regime through the injected action', () => {
    const injected = actions()
    commands.find((command) => command.code === 'CRASH')!.run(injected)
    expect(injected.forceRegime).toHaveBeenCalledWith('crash')
  })

  it('opens a symbol through the injected action', () => {
    const injected = actions()
    commands.find((command) => command.code === 'TESR')!.run(injected)
    expect(injected.openSymbol).toHaveBeenCalledWith('tesr')
  })
})

describe('matchCommands', () => {
  it('lists commands when the query is empty', () => {
    expect(matchCommands(commands, '   ', 5)).toHaveLength(5)
  })

  it('puts an exact code match first', () => {
    expect(matchCommands(commands, 'crt')[0]!.code).toBe('CRT')
  })

  it('is case insensitive', () => {
    expect(matchCommands(commands, 'tesr')[0]!.code).toBe('TESR')
  })

  it('matches a code prefix', () => {
    const results = matchCommands(commands, 'CRA')
    expect(results[0]!.code).toBe('CRASH')
  })

  it('falls back to matching the label', () => {
    const results = matchCommands(commands, 'graviton')
    expect(results[0]!.code).toBe('GRVN')
  })

  it('returns nothing for a query that matches nothing', () => {
    expect(matchCommands(commands, 'zzzzz')).toEqual([])
  })

  it('respects the limit', () => {
    expect(matchCommands(commands, 'a', 3).length).toBeLessThanOrEqual(3)
  })
})
