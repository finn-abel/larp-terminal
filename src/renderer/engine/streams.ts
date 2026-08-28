import type { Rng } from './rng'
import type { MarketPulse, RegimeProfile, StreamDefinition, StreamState } from './types'

/** Points retained per stream — enough for a sparkline or a chart warm-up. */
export const HISTORY_LIMIT = 240

/**
 * Restoring force toward the base price, expressed as extra drift.
 *
 * Deliberately soft rather than a clamp: the linear term is almost invisible during
 * normal trading, while the cubic term grows fast enough that large excursions become
 * progressively unlikely. Prices are bounded by probability, not by a wall.
 */
const REVERSION_LINEAR = 0.00022
const REVERSION_CUBIC = 0.012

export function createStreamState(definition: StreamDefinition): StreamState {
  return {
    definition,
    price: definition.basePrice,
    previousPrice: definition.basePrice,
    open: definition.basePrice,
    high: definition.basePrice,
    low: definition.basePrice,
    history: [definition.basePrice]
  }
}

/**
 * Advances one stream by `dtSeconds` and returns new state.
 *
 * The log return is a three-factor decomposition:
 *
 *   beta * (market drift + market shock)   — shared with every other stream
 * + sectorBeta * sector shock              — shared within the sector
 * + idiosyncratic drift and shock          — this stream alone
 * + restoring drift                        — soft pull toward the base price
 * - 0.5 * total variance                   — the Ito correction from Appendix A
 */
export function advanceStream(
  state: StreamState,
  dtSeconds: number,
  rng: Rng,
  profile: RegimeProfile,
  pulse: MarketPulse
): StreamState {
  const { definition } = state
  const idioVol = definition.vol * profile.volMultiplier
  const distance = Math.log(definition.basePrice / state.price)

  const marketVariance = (definition.beta * pulse.vol) ** 2
  const sectorVariance = (definition.sectorBeta * pulse.sectorVol) ** 2
  const totalVariance = marketVariance + sectorVariance + idioVol * idioVol

  const drift =
    definition.beta * pulse.drift +
    definition.drift +
    REVERSION_LINEAR * distance +
    REVERSION_CUBIC * distance ** 3 -
    0.5 * totalVariance

  const shock =
    definition.beta * pulse.shock +
    definition.sectorBeta * (pulse.sectorShocks[definition.sector] ?? 0) +
    idioVol * Math.sqrt(dtSeconds) * rng.normal()

  const candidate = state.price * Math.exp(drift * dtSeconds + shock)
  // Numerical guard only — not a price band. The restoring force does the bounding.
  const nextPrice = Number.isFinite(candidate) && candidate > 0 ? candidate : state.price

  const history =
    state.history.length < HISTORY_LIMIT
      ? [...state.history, nextPrice]
      : [...state.history.slice(state.history.length - HISTORY_LIMIT + 1), nextPrice]

  return {
    definition,
    price: nextPrice,
    previousPrice: state.price,
    open: state.open,
    high: Math.max(state.high, nextPrice),
    low: Math.min(state.low, nextPrice),
    history
  }
}

/** Absolute and percentage move since the session opened. */
export function streamChange(state: StreamState): { absolute: number; percent: number } {
  const absolute = state.price - state.open
  return { absolute, percent: (absolute / state.open) * 100 }
}
