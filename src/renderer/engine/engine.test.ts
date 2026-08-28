import { describe, expect, it, vi } from 'vitest'
import { MarketEngine } from './engine'
import { DEFAULT_SYMBOLS } from './symbols'
import type { EngineEvent, EngineSnapshot } from './types'

const DT = 1 / 12

function runEngine(seed: number, ticks: number): MarketEngine {
  const engine = new MarketEngine({ seed })
  for (let i = 0; i < ticks; i += 1) engine.step(DT)
  return engine
}

const prices = (snapshot: EngineSnapshot): number[] => snapshot.streams.map((s) => s.price)

describe('MarketEngine', () => {
  it('exposes an initial snapshot at the base prices', () => {
    const snapshot = new MarketEngine({ seed: 1 }).getSnapshot()
    expect(snapshot.tick).toBe(0)
    expect(snapshot.time).toBe(0)
    expect(snapshot.streams).toHaveLength(DEFAULT_SYMBOLS.length)
    expect(prices(snapshot)).toEqual(DEFAULT_SYMBOLS.map((s) => s.basePrice))
  })

  it('produces identical output for identical seeds', () => {
    const a = runEngine(1234, 2000).getSnapshot()
    const b = runEngine(1234, 2000).getSnapshot()

    expect(prices(a)).toEqual(prices(b))
    expect(a.regime).toEqual(b.regime)
    expect(a.time).toBe(b.time)
  })

  it('produces different output for different seeds', () => {
    expect(prices(runEngine(1, 2000).getSnapshot())).not.toEqual(
      prices(runEngine(2, 2000).getSnapshot())
    )
  })

  it('replays identically after setSeed', () => {
    const engine = new MarketEngine({ seed: 5 })
    for (let i = 0; i < 500; i += 1) engine.step(DT)
    const first = prices(engine.getSnapshot())

    engine.setSeed(5)
    expect(engine.getSnapshot().tick).toBe(0)
    for (let i = 0; i < 500; i += 1) engine.step(DT)

    expect(prices(engine.getSnapshot())).toEqual(first)
  })

  it('advances tick count and simulated time', () => {
    const snapshot = runEngine(3, 120).getSnapshot()
    expect(snapshot.tick).toBe(120)
    expect(snapshot.time).toBeCloseTo(10_000, 6)
  })

  it('transitions regimes over a long session', () => {
    const snapshot = runEngine(77, 12_000).getSnapshot()
    expect(snapshot.regime.transitions).toBeGreaterThan(2)
  })

  it('keeps every stream positive and finite', () => {
    for (const stream of runEngine(9, 8000).getSnapshot().streams) {
      expect(stream.price).toBeGreaterThan(0)
      expect(Number.isFinite(stream.price)).toBe(true)
    }
  })

  it('notifies subscribeAll listeners on every tick', () => {
    const engine = new MarketEngine({ seed: 4 })
    const listener = vi.fn()
    const unsubscribe = engine.subscribeAll(listener)

    engine.step(DT)
    engine.step(DT)
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
    engine.step(DT)
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('notifies per-stream listeners with only their stream', () => {
    const engine = new MarketEngine({ seed: 4 })
    const listener = vi.fn()
    const target = DEFAULT_SYMBOLS[1]!
    const unsubscribe = engine.subscribe(target.id, listener)

    engine.step(DT)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0]![0].definition.id).toBe(target.id)

    unsubscribe()
    engine.step(DT)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  describe('cross-sectional behaviour', () => {
    /** Holds a regime in place for `ticks`, then reports advancers vs decliners. */
    const breadth = (seed: number, regime: 'crash' | 'rally', ticks: number) => {
      const engine = new MarketEngine({ seed })
      engine.forceRegime(regime)
      for (let i = 0; i < ticks; i += 1) {
        engine.step(DT)
        if (engine.getSnapshot().regime.name !== regime) engine.forceRegime(regime)
      }
      const streams = engine.getSnapshot().streams
      const advancers = streams.filter((s) => s.price > s.open).length
      return { advancers, decliners: streams.length - advancers, streams }
    }

    it('never turns every stream red in a crash', () => {
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        const { advancers, decliners } = breadth(seed, 'crash', 180)
        expect(advancers).toBeGreaterThan(0)
        // ...while still reading as a crash.
        expect(decliners).toBeGreaterThan(advancers)
      }
    })

    // A rally builds more slowly than a crash breaks — its drift multiplier is a
    // quarter of the crash's — so this is measured over a full-length rally.
    it('never turns every stream green in a rally', () => {
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        const { advancers, streams } = breadth(seed, 'rally', 480)
        expect(advancers).toBeLessThan(streams.length)
        expect(advancers).toBeGreaterThan(streams.length / 2)
      }
    })

    it('moves the hedge against the momentum name during a crash', () => {
      const { streams } = breadth(4, 'crash', 240)
      const find = (symbol: string) => streams.find((s) => s.definition.symbol === symbol)!
      const hedge = find('GRVN')
      const momentum = find('TESR')

      expect(hedge.definition.beta).toBeLessThan(0)
      expect(hedge.price).toBeGreaterThan(hedge.open)
      expect(momentum.price).toBeLessThan(momentum.open)
    })

    it('keeps streams imperfectly correlated in calm', () => {
      const engine = new MarketEngine({ seed: 15 })
      let disagreements = 0
      for (let i = 0; i < 600; i += 1) {
        engine.step(DT)
        const streams = engine.getSnapshot().streams
        const up = streams.filter((s) => s.price > s.previousPrice).length
        if (up > 0 && up < streams.length) disagreements += 1
      }
      // Perfectly correlated streams would move as one block on every tick.
      expect(disagreements).toBeGreaterThan(550)
    })
  })

  it('emits events at a regime-scaled rate', () => {
    const collect = (regime: 'calm' | 'crash'): number => {
      const engine = new MarketEngine({ seed: 31 })
      const received: EngineEvent[] = []
      engine.subscribeEvents((events) => received.push(...events))
      engine.forceRegime(regime)
      for (let i = 0; i < 60; i += 1) engine.step(DT)
      return received.filter((event) => event.kind !== 'regime_shift').length
    }

    expect(collect('crash')).toBeGreaterThan(collect('calm'))
  })

  it('announces a regime shift when one is forced', () => {
    const engine = new MarketEngine({ seed: 8 })
    const received: EngineEvent[] = []
    engine.subscribeEvents((events) => received.push(...events))

    engine.forceRegime('crash')

    expect(engine.getSnapshot().regime.name).toBe('crash')
    expect(received).toHaveLength(1)
    expect(received[0]!.kind).toBe('regime_shift')
    expect(received[0]!.severity).toBe('critical')
  })

  it('gives every event a unique id', () => {
    const engine = new MarketEngine({ seed: 12 })
    const ids: string[] = []
    engine.subscribeEvents((events) => ids.push(...events.map((event) => event.id)))
    for (let i = 0; i < 3000; i += 1) engine.step(DT)

    expect(ids.length).toBeGreaterThan(50)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('runs and stops the headless loop', async () => {
    const engine = new MarketEngine({ seed: 2, tickHz: 60 })
    expect(engine.isRunning).toBe(false)

    engine.start()
    expect(engine.isRunning).toBe(true)
    await new Promise((resolve) => setTimeout(resolve, 120))
    engine.stop()

    const ticks = engine.getSnapshot().tick
    expect(ticks).toBeGreaterThan(0)
    expect(engine.isRunning).toBe(false)

    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(engine.getSnapshot().tick).toBe(ticks)
  })
})
