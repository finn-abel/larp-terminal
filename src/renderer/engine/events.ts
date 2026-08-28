import type { Rng } from './rng'
import { REGIMES } from './regime'
import { streamChange } from './streams'
import type { EngineEvent, EngineEventKind, EventSeverity, RegimeState, StreamState } from './types'

const KINDS: readonly EngineEventKind[] = ['order_filled', 'threshold_breach', 'node_reassigned']
const SIDES = ['BUY', 'SELL'] as const
const DESKS = ['LDN-3', 'NY-11', 'TOK-2', 'HKG-7', 'ZRH-1'] as const

export interface EventContext {
  readonly streams: readonly StreamState[]
  readonly regime: RegimeState
  readonly dtSeconds: number
  /** Simulated milliseconds since session start. */
  readonly time: number
  readonly rng: Rng
  /** Monotonic counter owned by the engine, so ids stay reproducible per seed. */
  readonly sequence: number
}

export interface EventBatch {
  readonly events: readonly EngineEvent[]
  readonly sequence: number
}

/**
 * Emits discrete events at a regime-scaled rate. The expected count per tick is
 * `eventRate * dt`; the fractional part becomes the probability of one more.
 */
export function generateEvents(context: EventContext): EventBatch {
  const { rng, regime, dtSeconds, streams } = context
  const expected = REGIMES[regime.name].eventRate * dtSeconds
  let count = Math.floor(expected)
  if (rng.next() < expected - count) count += 1
  if (count === 0 || streams.length === 0) return { events: [], sequence: context.sequence }

  const events: EngineEvent[] = []
  let sequence = context.sequence

  for (let index = 0; index < count; index += 1) {
    sequence += 1
    events.push(buildEvent(rng.pick(KINDS), context, sequence))
  }

  return { events, sequence }
}

/** Announcement fired by the engine whenever the regime state machine transitions. */
export function regimeShiftEvent(regime: RegimeState, time: number, sequence: number): EngineEvent {
  const profile = REGIMES[regime.name]
  return {
    id: `ev-${sequence}`,
    kind: 'regime_shift',
    severity: regime.name === 'crash' ? 'critical' : regime.name === 'calm' ? 'info' : 'warn',
    at: time,
    message: `REGIME SHIFT · ${profile.code}`
  }
}

function buildEvent(kind: EngineEventKind, context: EventContext, sequence: number): EngineEvent {
  const { rng, time } = context
  const stream = rng.pick(context.streams)
  const id = `ev-${sequence}`

  if (kind === 'threshold_breach') {
    const { percent } = streamChange(stream)
    return {
      id,
      kind,
      severity: severityFor(kind, context.regime),
      at: time,
      symbol: stream.definition.symbol,
      message: `THRESHOLD BREACH · ${stream.definition.symbol} ${formatSigned(percent)}% OUTSIDE ${rng.int(2) + 2}σ BAND`
    }
  }

  if (kind === 'node_reassigned') {
    return {
      id,
      kind,
      severity: severityFor(kind, context.regime),
      at: time,
      message: `NODE 0x${hex(rng, 2)} REASSIGNED → CLUSTER ${rng.int(9) + 1}`
    }
  }

  const quantity = (rng.int(45) + 5) * 100
  return {
    id,
    kind,
    severity: severityFor(kind, context.regime),
    at: time,
    symbol: stream.definition.symbol,
    message: `ORDER FILLED · ${rng.pick(SIDES)} ${quantity.toLocaleString('en-US')} ${stream.definition.symbol} @ ${stream.price.toFixed(2)} · ${rng.pick(DESKS)}`
  }
}

function severityFor(kind: EngineEventKind, regime: RegimeState): EventSeverity {
  if (kind === 'threshold_breach') return regime.name === 'crash' ? 'critical' : 'warn'
  if (regime.name === 'crash') return 'warn'
  return 'info'
}

function formatSigned(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`
}

function hex(rng: Rng, bytes: number): string {
  return rng
    .int(16 ** (bytes * 2))
    .toString(16)
    .toUpperCase()
    .padStart(bytes * 2, '0')
}
