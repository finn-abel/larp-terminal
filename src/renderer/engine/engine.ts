import { createRng, type Rng } from './rng'
import { advanceRegime, createRegimeState, enterRegime, REGIMES } from './regime'
import { advanceStream, createStreamState } from './streams'
import { createPulse } from './market'
import { generateEvents, regimeShiftEvent } from './events'
import { DEFAULT_SYMBOLS } from './symbols'
import type {
  EngineEvent,
  EngineSnapshot,
  EventListener,
  RegimeName,
  SnapshotListener,
  StreamDefinition,
  StreamListener,
  StreamState,
  Unsubscribe
} from './types'

export interface EngineOptions {
  readonly seed?: number
  readonly symbols?: readonly StreamDefinition[]
  /** Emitted ticks per real second (Appendix A calls for 5-15hz). */
  readonly tickHz?: number
}

const DEFAULT_SEED = 20260828
const DEFAULT_TICK_HZ = 12
/** A backgrounded window can hand back a huge delta; never simulate more than this. */
const MAX_STEP_SECONDS = 0.5

/**
 * The simulation. Framework-agnostic by design: it knows nothing about React, and the
 * store in `store/useMarketStore.ts` is the only thing that bridges it into the UI.
 */
export class MarketEngine {
  private readonly symbols: readonly StreamDefinition[]
  private readonly sectors: readonly string[]
  private readonly tickIntervalSeconds: number

  private rng: Rng
  private snapshot: EngineSnapshot
  private sequence = 0

  private readonly snapshotListeners = new Set<SnapshotListener>()
  private readonly streamListeners = new Map<string, Set<StreamListener>>()
  private readonly eventListeners = new Set<EventListener>()

  private running = false
  private frameHandle: number | null = null
  private intervalHandle: ReturnType<typeof setInterval> | null = null
  private lastFrameTime = 0
  private accumulator = 0

  constructor(options: EngineOptions = {}) {
    this.symbols = options.symbols ?? DEFAULT_SYMBOLS
    this.sectors = [...new Set(this.symbols.map((definition) => definition.sector))]
    this.tickIntervalSeconds = 1 / (options.tickHz ?? DEFAULT_TICK_HZ)
    this.rng = createRng(options.seed ?? DEFAULT_SEED)
    this.snapshot = this.createSnapshot(options.seed ?? DEFAULT_SEED)
  }

  getSnapshot(): EngineSnapshot {
    return this.snapshot
  }

  /** Restarts the session from a fresh seed. Listeners stay attached. */
  setSeed(seed: number): void {
    this.rng = createRng(seed)
    this.sequence = 0
    this.snapshot = this.createSnapshot(seed)
    this.emit([])
  }

  /** Jumps to a regime immediately — for the command palette and demos. */
  forceRegime(name: RegimeName): void {
    const regime = enterRegime(this.snapshot.regime, name, this.rng)
    this.snapshot = { ...this.snapshot, regime }
    this.sequence += 1
    this.emit([regimeShiftEvent(regime, this.snapshot.time, this.sequence)])
  }

  /**
   * Advances the simulation by `dtSeconds` and publishes the result. Called by the run
   * loop, and directly by tests — which is what keeps the engine deterministic.
   */
  step(dtSeconds: number): EngineSnapshot {
    const previous = this.snapshot
    const regime = advanceRegime(previous.regime, dtSeconds, this.rng)
    const profile = REGIMES[regime.name]
    // One shared pulse per tick, then each stream applies its own exposure to it.
    const pulse = createPulse(profile, dtSeconds, this.sectors, this.rng)
    const streams = previous.streams.map((stream) =>
      advanceStream(stream, dtSeconds, this.rng, profile, pulse)
    )

    const time = previous.time + dtSeconds * 1000
    this.snapshot = { tick: previous.tick + 1, time, seed: previous.seed, regime, streams }

    const batch = generateEvents({
      streams,
      regime,
      dtSeconds,
      time,
      rng: this.rng,
      sequence: this.sequence
    })
    this.sequence = batch.sequence

    const events =
      regime.name === previous.regime.name
        ? batch.events
        : [regimeShiftEvent(regime, time, (this.sequence += 1)), ...batch.events]

    this.emit(events)
    return this.snapshot
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.accumulator = 0

    if (typeof requestAnimationFrame === 'function') {
      this.lastFrameTime = now()
      this.frameHandle = requestAnimationFrame(this.onFrame)
      return
    }

    // Headless fallback (tests, or a renderer without rAF).
    this.intervalHandle = setInterval(
      () => this.step(this.tickIntervalSeconds),
      this.tickIntervalSeconds * 1000
    )
  }

  stop(): void {
    if (!this.running) return
    this.running = false

    if (this.frameHandle !== null) {
      cancelAnimationFrame(this.frameHandle)
      this.frameHandle = null
    }
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle)
      this.intervalHandle = null
    }
  }

  get isRunning(): boolean {
    return this.running
  }

  subscribeAll(listener: SnapshotListener): Unsubscribe {
    this.snapshotListeners.add(listener)
    return () => {
      this.snapshotListeners.delete(listener)
    }
  }

  subscribe(streamId: string, listener: StreamListener): Unsubscribe {
    const listeners = this.streamListeners.get(streamId) ?? new Set<StreamListener>()
    listeners.add(listener)
    this.streamListeners.set(streamId, listeners)
    return () => {
      listeners.delete(listener)
      if (listeners.size === 0) this.streamListeners.delete(streamId)
    }
  }

  subscribeEvents(listener: EventListener): Unsubscribe {
    this.eventListeners.add(listener)
    return () => {
      this.eventListeners.delete(listener)
    }
  }

  /** rAF drives the clock, but ticks are throttled to the configured rate. */
  private readonly onFrame = (): void => {
    if (!this.running) return
    const timestamp = now()
    const elapsed = Math.min((timestamp - this.lastFrameTime) / 1000, MAX_STEP_SECONDS)
    this.lastFrameTime = timestamp
    this.accumulator += elapsed

    while (this.accumulator >= this.tickIntervalSeconds) {
      this.accumulator -= this.tickIntervalSeconds
      this.step(this.tickIntervalSeconds)
    }

    this.frameHandle = requestAnimationFrame(this.onFrame)
  }

  private createSnapshot(seed: number): EngineSnapshot {
    return {
      tick: 0,
      time: 0,
      seed,
      regime: createRegimeState(this.rng),
      streams: this.symbols.map(createStreamState)
    }
  }

  private emit(events: readonly EngineEvent[]): void {
    const snapshot = this.snapshot

    for (const listener of this.snapshotListeners) listener(snapshot)

    if (this.streamListeners.size > 0) {
      for (const stream of snapshot.streams) {
        const listeners = this.streamListeners.get(stream.definition.id)
        if (!listeners) continue
        for (const listener of listeners) listener(stream, snapshot)
      }
    }

    if (events.length > 0) {
      for (const listener of this.eventListeners) listener(events, snapshot)
    }
  }
}

function now(): number {
  return typeof performance === 'object' ? performance.now() : Date.now()
}

export type { EngineSnapshot, EngineEvent, StreamState }
