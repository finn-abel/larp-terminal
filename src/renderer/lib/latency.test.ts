import { describe, expect, it } from 'vitest'
import { latencyFor, signalBars } from './latency'

describe('latencyFor', () => {
  it('is deterministic for a tick and regime', () => {
    expect(latencyFor(120, 'calm')).toBe(latencyFor(120, 'calm'))
  })

  it('stays positive and plausible across a long session', () => {
    for (const regime of ['calm', 'rally', 'crash', 'high_vol'] as const) {
      for (let tick = 0; tick < 5000; tick += 7) {
        const value = latencyFor(tick, regime)
        expect(value).toBeGreaterThan(0)
        expect(value).toBeLessThan(20)
      }
    }
  })

  it('degrades under stressed regimes', () => {
    const mean = (regime: 'calm' | 'crash'): number => {
      let total = 0
      for (let tick = 0; tick < 400; tick += 1) total += latencyFor(tick, regime)
      return total / 400
    }

    expect(mean('crash')).toBeGreaterThan(mean('calm') * 2)
  })

  it('varies from tick to tick rather than sitting still', () => {
    const values = new Set(Array.from({ length: 50 }, (_, tick) => latencyFor(tick, 'calm')))
    expect(values.size).toBeGreaterThan(40)
  })
})

describe('signalBars', () => {
  it('drops as latency climbs', () => {
    expect(signalBars(1)).toBe(4)
    expect(signalBars(3)).toBe(3)
    expect(signalBars(5)).toBe(2)
    expect(signalBars(12)).toBe(1)
  })
})
