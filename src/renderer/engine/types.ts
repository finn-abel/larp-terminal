/** Shared engine types. Pure data — nothing here imports React or the DOM. */

export type RegimeName = 'calm' | 'rally' | 'crash' | 'high_vol'

export interface RegimeProfile {
  readonly name: RegimeName
  /** Short code shown in the status bar. */
  readonly code: string
  readonly driftMultiplier: number
  readonly volMultiplier: number
  /** Mean discrete events emitted per simulated second. */
  readonly eventRate: number
  readonly minDurationSeconds: number
  readonly maxDurationSeconds: number
  /** Weighted odds of entering each other regime when this one expires. */
  readonly transitions: Readonly<Record<RegimeName, number>>
}

export interface RegimeState {
  readonly name: RegimeName
  readonly elapsedSeconds: number
  readonly durationSeconds: number
  /** How many transitions have happened this session. */
  readonly transitions: number
}

export interface StreamDefinition {
  readonly id: string
  readonly symbol: string
  readonly name: string
  readonly sector: string
  readonly basePrice: number
  /** Idiosyncratic per-second log drift, before regime multipliers. */
  readonly drift: number
  /** Idiosyncratic per-sqrt(second) volatility, before regime multipliers. */
  readonly vol: number
  /** Sensitivity to the market factor. Below 1 is defensive; negative is a hedge. */
  readonly beta: number
  /** Sensitivity to this stream's sector factor. */
  readonly sectorBeta: number
}

/** The shared shocks for one tick: one market-wide, one per sector. */
export interface MarketPulse {
  /** Per-second log drift of the market factor, after regime multipliers. */
  readonly drift: number
  /** Realised market log shock for this tick. */
  readonly shock: number
  /** Market volatility after regime multipliers, for the Ito correction. */
  readonly vol: number
  readonly sectorVol: number
  readonly sectorShocks: Readonly<Record<string, number>>
}

export interface StreamState {
  readonly definition: StreamDefinition
  readonly price: number
  readonly previousPrice: number
  /** Price at the start of the session, for the change columns. */
  readonly open: number
  readonly high: number
  readonly low: number
  readonly history: readonly number[]
}

export type EngineEventKind =
  | 'order_filled'
  | 'threshold_breach'
  | 'node_reassigned'
  | 'regime_shift'

export type EventSeverity = 'info' | 'warn' | 'critical'

export interface EngineEvent {
  readonly id: string
  readonly kind: EngineEventKind
  readonly severity: EventSeverity
  /** Simulated milliseconds since the session started. */
  readonly at: number
  readonly message: string
  readonly symbol?: string
}

export interface EngineSnapshot {
  readonly tick: number
  /** Simulated milliseconds since the session started. */
  readonly time: number
  readonly seed: number
  readonly regime: RegimeState
  readonly streams: readonly StreamState[]
}

export type SnapshotListener = (snapshot: EngineSnapshot) => void
export type StreamListener = (stream: StreamState, snapshot: EngineSnapshot) => void
export type EventListener = (events: readonly EngineEvent[], snapshot: EngineSnapshot) => void
export type Unsubscribe = () => void
