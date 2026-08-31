import { DEFAULT_SYMBOLS, type StreamState } from '@renderer/engine'

/**
 * Fake position sizes. Derived from the symbol list rather than typed out, so the book
 * stays consistent if the catalogue changes — and stays obviously invented either way.
 */
const HOLDINGS: ReadonlyMap<string, number> = new Map(
  DEFAULT_SYMBOLS.map((definition, index) => [
    definition.id,
    Math.round((4200 - index * 210) / (definition.basePrice > 300 ? 4 : 1))
  ])
)

export interface PortfolioValue {
  readonly total: number
  readonly open: number
  readonly absolute: number
  readonly percent: number
}

/**
 * Book value over the session, reconstructed from the streams' own history buffers.
 * Every stream keeps the same number of points, so index `i` is the same instant across
 * all of them — which means no separate history has to be recorded here.
 */
export function portfolioHistory(
  streams: readonly StreamState[],
  samples = 120
): readonly number[] {
  if (streams.length === 0) return []

  const length = Math.min(...streams.map((stream) => stream.history.length))
  if (length === 0) return []

  const step = Math.max(1, Math.floor(length / samples))
  const points: number[] = []

  for (let index = length - 1; index >= 0; index -= step) {
    let total = 0
    for (const stream of streams) {
      // Align to the end, since buffers can differ in length by a tick.
      const offset = stream.history.length - (length - index)
      total += (stream.history[offset] ?? stream.price) * holdingsFor(stream.definition.id)
    }
    points.push(total)
  }

  return points.reverse()
}

export function holdingsFor(streamId: string): number {
  return HOLDINGS.get(streamId) ?? 0
}

/** Mark-to-market of the whole book, plus its move since the session opened. */
export function portfolioValue(streams: readonly StreamState[]): PortfolioValue {
  let total = 0
  let open = 0

  for (const stream of streams) {
    const size = holdingsFor(stream.definition.id)
    total += stream.price * size
    open += stream.open * size
  }

  const absolute = total - open
  return { total, open, absolute, percent: open === 0 ? 0 : (absolute / open) * 100 }
}
