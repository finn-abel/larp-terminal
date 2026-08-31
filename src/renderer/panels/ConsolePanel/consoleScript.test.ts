import { describe, expect, it } from 'vitest'
import { createScriptRng, nextExchange } from './consoleScript'

const context = { regime: 'calm' as const, symbols: ['QVNX', 'TESR'] }

describe('consoleScript', () => {
  it('returns a command followed by its output', () => {
    const lines = nextExchange(createScriptRng(1), context)

    expect(lines).toHaveLength(2)
    expect(lines[0]!.output).toBe(false)
    expect(lines[0]!.prompt).toBe('$')
    expect(lines[1]!.output).toBe(true)
  })

  it('is reproducible for a seed', () => {
    const rng = () => createScriptRng(42)
    expect(nextExchange(rng(), context)).toEqual(nextExchange(rng(), context))
  })

  it('leaves no placeholders unfilled', () => {
    const rng = createScriptRng(7)
    for (let i = 0; i < 200; i += 1) {
      for (const line of nextExchange(rng, context)) {
        expect(line.text).not.toMatch(/\{[a-z0-9]+\}/i)
      }
    }
  })

  it('only ever uses symbols it was given', () => {
    const rng = createScriptRng(3)
    for (let i = 0; i < 100; i += 1) {
      const [command] = nextExchange(rng, context)
      const mentioned = /\b(QVNX|TESR)\b/.exec(command!.text)
      if (mentioned) expect(context.symbols).toContain(mentioned[0])
    }
  })

  it('falls back to a symbol when the book is empty', () => {
    const lines = nextExchange(createScriptRng(5), { regime: 'calm', symbols: [] })
    expect(lines[0]!.text).not.toMatch(/\{sym\}/)
  })

  it('warns more often under stress than in calm', () => {
    const count = (regime: 'calm' | 'crash'): number => {
      const rng = createScriptRng(11)
      let warnings = 0
      for (let i = 0; i < 200; i += 1) {
        const [, output] = nextExchange(rng, { regime, symbols: context.symbols })
        if (output!.text.startsWith('WARN')) warnings += 1
      }
      return warnings
    }

    expect(count('crash')).toBeGreaterThan(count('calm'))
    expect(count('calm')).toBe(0)
  })
})
