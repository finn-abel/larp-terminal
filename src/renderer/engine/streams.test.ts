import { describe, expect, it } from 'vitest'
import { createRng, type Rng } from './rng'
import { REGIMES } from './regime'
import { createPulse } from './market'
import { advanceStream, createStreamState, HISTORY_LIMIT, streamChange } from './streams'
import { DEFAULT_SYMBOLS, SECTORS } from './symbols'
import type { MarketPulse, StreamDefinition, StreamState } from './types'

const DT = 1 / 12
const [definition] = DEFAULT_SYMBOLS

/** An rng with the randomness removed, so a single factor can be tested in isolation. */
const flatRng: Rng = {
  next: () => 0.5,
  normal: () => 0,
  int: () => 0,
  range: (min) => min,
  pick: (items) => items[0]!
}

const quietPulse: MarketPulse = {
  drift: 0,
  shock: 0,
  vol: 0,
  sectorVol: 0,
  sectorShocks: {}
}

function withPrice(price: number, def: StreamDefinition = definition!): StreamState {
  return { ...createStreamState(def), price, previousPrice: price }
}

/** Advances one stream for `ticks` under the given regime, market factor included. */
function run(seed: number, ticks: number, regime = REGIMES.calm): StreamState {
  const rng = createRng(seed)
  let state = createStreamState(definition!)
  for (let i = 0; i < ticks; i += 1) {
    const pulse = createPulse(regime, DT, SECTORS, rng)
    state = advanceStream(state, DT, rng, regime, pulse)
  }
  return state
}

describe('price streams', () => {
  it('starts at the base price', () => {
    const state = createStreamState(definition!)
    expect(state.price).toBe(definition!.basePrice)
    expect(state.history).toEqual([definition!.basePrice])
  })

  it('is reproducible for a given seed', () => {
    expect(run(88, 500).history).toEqual(run(88, 500).history)
  })

  it('diverges for a different seed', () => {
    expect(run(88, 500).price).not.toBe(run(89, 500).price)
  })

  it('stays positive and finite across regimes', () => {
    for (const regime of Object.values(REGIMES)) {
      for (const seed of [1, 2, 3]) {
        const state = run(seed, 4000, regime)
        expect(state.price).toBeGreaterThan(0)
        expect(Number.isFinite(state.price)).toBe(true)
      }
    }
  })

  it('keeps prices in a plausible band over a long session without clamping', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const ratio = run(seed, 20_000).price / definition!.basePrice
      expect(ratio).toBeGreaterThan(0.4)
      expect(ratio).toBeLessThan(2.5)
    }
  })

  it('drifts rather than jumping', () => {
    const rng = createRng(21)
    let state = createStreamState(definition!)
    for (let i = 0; i < 2000; i += 1) {
      const pulse = createPulse(REGIMES.calm, DT, SECTORS, rng)
      const next = advanceStream(state, DT, rng, REGIMES.calm, pulse)
      expect(Math.abs(next.price - state.price) / state.price).toBeLessThan(0.01)
      state = next
    }
  })

  it('caps history at the rolling window and keeps the newest point last', () => {
    const state = run(4, HISTORY_LIMIT * 2)
    expect(state.history).toHaveLength(HISTORY_LIMIT)
    expect(state.history.at(-1)).toBe(state.price)
  })

  it('tracks session high and low around the current price', () => {
    const state = run(6, 1500)
    expect(state.high).toBeGreaterThanOrEqual(state.price)
    expect(state.low).toBeLessThanOrEqual(state.price)
  })

  it('reports change against the session open', () => {
    const state = run(9, 800)
    const { absolute, percent } = streamChange(state)
    expect(absolute).toBeCloseTo(state.price - state.open, 10)
    expect(percent).toBeCloseTo((absolute / state.open) * 100, 10)
  })

  it('does not mutate the state it is given', () => {
    const rng = createRng(1)
    const state = createStreamState(definition!)
    const snapshot = { ...state, history: [...state.history] }
    advanceStream(state, DT, rng, REGIMES.calm, createPulse(REGIMES.calm, DT, SECTORS, rng))

    expect(state.price).toBe(snapshot.price)
    expect(state.history).toEqual(snapshot.history)
  })

  describe('factor exposure', () => {
    const shockedPulse: MarketPulse = { ...quietPulse, shock: -0.02 }
    const withBeta = (beta: number): StreamDefinition => ({
      ...definition!,
      beta,
      sectorBeta: 0,
      drift: 0,
      vol: 0
    })

    it('moves a positive-beta stream with the market', () => {
      const state = withPrice(100, withBeta(1))
      const next = advanceStream(state, DT, flatRng, REGIMES.calm, shockedPulse)
      expect(next.price).toBeLessThan(state.price)
    })

    it('moves a negative-beta stream against the market', () => {
      const state = withPrice(100, withBeta(-0.75))
      const next = advanceStream(state, DT, flatRng, REGIMES.calm, shockedPulse)
      expect(next.price).toBeGreaterThan(state.price)
    })

    it('scales the move by the size of beta', () => {
      const gentle = advanceStream(withPrice(100, withBeta(0.5)), DT, flatRng, REGIMES.calm, shockedPulse)
      const violent = advanceStream(withPrice(100, withBeta(1.5)), DT, flatRng, REGIMES.calm, shockedPulse)
      expect(violent.price).toBeLessThan(gentle.price)
    })

    it('applies the sector shock only to streams in that sector', () => {
      // basePrice matches the test price so the restoring force contributes nothing.
      const def = { ...definition!, basePrice: 100, beta: 0, sectorBeta: 1, drift: 0, vol: 0 }
      const pulse: MarketPulse = { ...quietPulse, sectorShocks: { [def.sector]: 0.02 } }
      const inSector = advanceStream(withPrice(100, def), DT, flatRng, REGIMES.calm, pulse)
      const outside = advanceStream(
        withPrice(100, { ...def, sector: 'OTHER' }),
        DT,
        flatRng,
        REGIMES.calm,
        pulse
      )

      expect(inSector.price).toBeGreaterThan(100)
      expect(outside.price).toBe(100)
    })
  })

  describe('soft bounds', () => {
    const inert = { ...definition!, beta: 0, sectorBeta: 0, drift: 0, vol: 0, basePrice: 100 }
    /** Log return produced purely by the restoring force at a given displacement. */
    const recovery = (price: number): number => {
      const next = advanceStream(withPrice(price, inert), DT, flatRng, REGIMES.calm, quietPulse)
      return Math.log(next.price / price)
    }

    it('pulls back toward the base price from either side', () => {
      expect(recovery(60)).toBeGreaterThan(0)
      expect(recovery(160)).toBeLessThan(0)
    })

    it('barely interferes near the base price', () => {
      expect(Math.abs(recovery(98))).toBeLessThan(1e-5)
    })

    it('strengthens sharply with distance rather than acting as a wall', () => {
      const near = recovery(90)
      const far = recovery(50)
      // Cubic term: five times the displacement should pull far more than five times harder.
      expect(far).toBeGreaterThan(near * 20)
      // ...and it is still a finite nudge, not a clamp.
      expect(far).toBeLessThan(0.01)
    })

    it('leaves no clamped prices piled up at a boundary', () => {
      const prices = run(12, 6000).history
      expect(new Set(prices).size).toBe(prices.length)
    })
  })
})
