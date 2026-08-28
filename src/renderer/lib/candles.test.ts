import { describe, expect, it } from 'vitest'
import { bucketFor, closeSeries, createCandleState, pushPrice, seedCandles } from './candles'

const state = (interval = 2, limit = 5): ReturnType<typeof createCandleState> =>
  createCandleState(interval, limit)

/** Feeds a list of [time, price] pairs and returns the resulting state. */
function feed(points: readonly [number, number][], interval = 2, limit = 5) {
  return points.reduce(
    (current, [time, price]) => pushPrice(current, time, price).state,
    state(interval, limit)
  )
}

describe('candle aggregation', () => {
  it('rejects a non-positive interval or limit', () => {
    expect(() => createCandleState(0, 10)).toThrow()
    expect(() => createCandleState(2, 0)).toThrow()
  })

  it('buckets timestamps down to the interval', () => {
    expect(bucketFor(0, 2)).toBe(0)
    expect(bucketFor(1.9, 2)).toBe(0)
    expect(bucketFor(2, 2)).toBe(2)
    expect(bucketFor(7.5, 2)).toBe(6)
  })

  it('opens a candle at the first price of a bucket', () => {
    const result = pushPrice(state(), 0.4, 100)
    expect(result.structureChanged).toBe(true)
    expect(result.state.candles).toEqual([{ time: 0, open: 100, high: 100, low: 100, close: 100 }])
  })

  it('folds later prices in the same bucket into one candle', () => {
    const result = feed([
      [0, 100],
      [0.5, 104],
      [1.0, 96],
      [1.5, 101]
    ])
    expect(result.candles).toEqual([{ time: 0, open: 100, high: 104, low: 96, close: 101 }])
  })

  it('opens a new candle when the bucket rolls over', () => {
    const result = feed([
      [1.9, 100],
      [2.0, 103]
    ])
    expect(result.candles).toHaveLength(2)
    expect(result.candles[1]).toEqual({ time: 2, open: 103, high: 103, low: 103, close: 103 })
  })

  it('reports a structure change only when a bucket opens', () => {
    const first = pushPrice(state(), 0, 100)
    const same = pushPrice(first.state, 1, 101)
    const next = pushPrice(same.state, 2, 102)

    expect(first.structureChanged).toBe(true)
    expect(same.structureChanged).toBe(false)
    expect(next.structureChanged).toBe(true)
  })

  it('ignores ticks that arrive out of order', () => {
    const forward = feed([
      [0, 100],
      [4, 110]
    ])
    const stale = pushPrice(forward, 1, 999)

    expect(stale.state).toBe(forward)
    expect(stale.structureChanged).toBe(false)
  })

  it('keeps only the most recent candles', () => {
    const result = feed(Array.from({ length: 12 }, (_, i) => [i * 2, 100 + i] as [number, number]))
    expect(result.candles).toHaveLength(5)
    expect(result.candles[0]!.time).toBe(14)
    expect(result.candles.at(-1)!.time).toBe(22)
  })

  it('never mutates the state it is given', () => {
    const original = feed([[0, 100]])
    const snapshot = JSON.parse(JSON.stringify(original))
    pushPrice(original, 0.5, 120)
    pushPrice(original, 2, 120)

    expect(original).toEqual(snapshot)
  })

  it('seeds from a price history in order', () => {
    const seeded = seedCandles(state(2, 10), [
      { time: 0, price: 10 },
      { time: 1, price: 12 },
      { time: 2, price: 11 }
    ])
    expect(seeded.candles).toEqual([
      { time: 0, open: 10, high: 12, low: 10, close: 12 },
      { time: 2, open: 11, high: 11, low: 11, close: 11 }
    ])
  })

  it('derives a close-price line series', () => {
    const result = feed([
      [0, 100],
      [2, 105]
    ])
    expect(closeSeries(result)).toEqual([
      { time: 0, value: 100 },
      { time: 2, value: 105 }
    ])
  })
})
