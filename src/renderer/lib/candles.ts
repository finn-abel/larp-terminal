/**
 * Aggregates a tick stream into OHLC candles.
 *
 * Pure and framework-free, like the engine: state goes in, new state comes out, so the
 * bucketing rules can be tested without a chart or a DOM.
 */

export interface Candle {
  /** Bucket start, in whole seconds. */
  readonly time: number
  readonly open: number
  readonly high: number
  readonly low: number
  readonly close: number
}

export interface CandleState {
  readonly candles: readonly Candle[]
  readonly intervalSeconds: number
  readonly limit: number
}

export interface CandleUpdate {
  readonly state: CandleState
  /** True when this price started a new bucket, or trimmed an old one off the front. */
  readonly structureChanged: boolean
}

export function createCandleState(intervalSeconds: number, limit: number): CandleState {
  if (intervalSeconds <= 0) throw new Error('candle interval must be positive')
  if (limit <= 0) throw new Error('candle limit must be positive')
  return { candles: [], intervalSeconds, limit }
}

/** Rounds a timestamp down to the start of its bucket. */
export function bucketFor(timeSeconds: number, intervalSeconds: number): number {
  return Math.floor(timeSeconds / intervalSeconds) * intervalSeconds
}

export function pushPrice(state: CandleState, timeSeconds: number, price: number): CandleUpdate {
  const bucket = bucketFor(timeSeconds, state.intervalSeconds)
  const last = state.candles.at(-1)

  // Ticks arriving out of order would corrupt the series; ignore them.
  if (last && bucket < last.time) return { state, structureChanged: false }

  if (last && bucket === last.time) {
    const updated: Candle = {
      time: last.time,
      open: last.open,
      high: Math.max(last.high, price),
      low: Math.min(last.low, price),
      close: price
    }
    return {
      state: { ...state, candles: [...state.candles.slice(0, -1), updated] },
      structureChanged: false
    }
  }

  const opened: Candle = { time: bucket, open: price, high: price, low: price, close: price }
  const appended = [...state.candles, opened]
  const candles = appended.length > state.limit ? appended.slice(appended.length - state.limit) : appended

  return { state: { ...state, candles }, structureChanged: true }
}

/** Replays a price history onto a fresh state, oldest first. */
export function seedCandles(
  state: CandleState,
  points: readonly { time: number; price: number }[]
): CandleState {
  return points.reduce((current, point) => pushPrice(current, point.time, point.price).state, state)
}

/** Close prices, for the line variant of the panel. */
export function closeSeries(state: CandleState): readonly { time: number; value: number }[] {
  return state.candles.map((candle) => ({ time: candle.time, value: candle.close }))
}
