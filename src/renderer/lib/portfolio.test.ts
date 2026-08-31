import { describe, expect, it } from 'vitest'
import { DEFAULT_SYMBOLS } from '@renderer/engine'
import { createStreamState } from '@renderer/engine/streams'
import { holdingsFor, portfolioHistory, portfolioValue } from './portfolio'
import type { StreamState } from '@renderer/engine'

const priced = (index: number, price: number): StreamState => ({
  ...createStreamState(DEFAULT_SYMBOLS[index]!),
  price
})

describe('portfolio', () => {
  it('gives every catalogued symbol a position', () => {
    for (const definition of DEFAULT_SYMBOLS) {
      expect(holdingsFor(definition.id)).toBeGreaterThan(0)
    }
  })

  it('reports zero for an unknown symbol', () => {
    expect(holdingsFor('not-a-symbol')).toBe(0)
  })

  it('marks the book to market', () => {
    const streams = [priced(0, 100), priced(1, 50)]
    const expected =
      100 * holdingsFor(DEFAULT_SYMBOLS[0]!.id) + 50 * holdingsFor(DEFAULT_SYMBOLS[1]!.id)

    expect(portfolioValue(streams).total).toBeCloseTo(expected, 6)
  })

  it('is flat at the open', () => {
    const streams = DEFAULT_SYMBOLS.map((definition) => createStreamState(definition))
    const value = portfolioValue(streams)

    expect(value.absolute).toBeCloseTo(0, 6)
    expect(value.percent).toBeCloseTo(0, 6)
  })

  it('moves with the book', () => {
    const base = DEFAULT_SYMBOLS[0]!
    const up = portfolioValue([{ ...createStreamState(base), price: base.basePrice * 1.1 }])
    const down = portfolioValue([{ ...createStreamState(base), price: base.basePrice * 0.9 }])

    expect(up.percent).toBeCloseTo(10, 6)
    expect(down.percent).toBeCloseTo(-10, 6)
  })

  it('handles an empty book without dividing by zero', () => {
    expect(portfolioValue([])).toEqual({ total: 0, open: 0, absolute: 0, percent: 0 })
  })
})

describe('portfolioHistory', () => {
  const withHistory = (index: number, history: number[]): StreamState => ({
    ...createStreamState(DEFAULT_SYMBOLS[index]!),
    history
  })

  it('returns nothing for an empty book', () => {
    expect(portfolioHistory([])).toEqual([])
  })

  it('returns nothing when no history has accumulated', () => {
    expect(portfolioHistory([withHistory(0, [])])).toEqual([])
  })

  it('sums the book at each point in time', () => {
    const size = holdingsFor(DEFAULT_SYMBOLS[0]!.id)
    expect(portfolioHistory([withHistory(0, [10, 20, 30])])).toEqual([
      10 * size,
      20 * size,
      30 * size
    ])
  })

  it('ends on the latest value', () => {
    const size = holdingsFor(DEFAULT_SYMBOLS[0]!.id)
    const points = portfolioHistory([withHistory(0, [1, 2, 3, 4, 5])])
    expect(points.at(-1)).toBe(5 * size)
  })

  it('downsamples a long history toward the requested count', () => {
    const points = portfolioHistory([withHistory(0, Array.from({ length: 900 }, (_, i) => i))], 100)
    expect(points.length).toBeGreaterThan(50)
    expect(points.length).toBeLessThanOrEqual(120)
  })

  it('tolerates streams whose buffers differ in length', () => {
    const points = portfolioHistory([withHistory(0, [1, 2, 3]), withHistory(1, [4, 5])])
    expect(points).toHaveLength(2)
    expect(points.every(Number.isFinite)).toBe(true)
  })
})
