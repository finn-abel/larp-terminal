import { create } from 'zustand'
import { MarketEngine } from '@renderer/engine'
import type { EngineEvent, EngineSnapshot, RegimeName, StreamState } from '@renderer/engine'

/** Newest-first ring of recent events, sized for the alerts feed in Step 6. */
const EVENT_BUFFER = 200

/** One engine per renderer. React only ever sees it through this store. */
export const engine = new MarketEngine()

interface MarketStore {
  snapshot: EngineSnapshot
  events: readonly EngineEvent[]
}

const useStore = create<MarketStore>(() => ({
  snapshot: engine.getSnapshot(),
  events: []
}))

engine.subscribeAll((snapshot) => useStore.setState({ snapshot }))

engine.subscribeEvents((incoming) => {
  useStore.setState((state) => ({
    events: [...incoming].reverse().concat(state.events).slice(0, EVENT_BUFFER)
  }))
})

/**
 * The engine is a module-level singleton holding simulation state outside React. A
 * partial hot update would swap in a fresh, unstarted engine and leave the old one
 * running headless, so any update reaching this module reloads the window instead.
 * Component and stylesheet edits are unaffected and still hot-update in place.
 */
if (import.meta.hot) {
  import.meta.hot.accept(() => window.location.reload())
}

export const useMarketStore = useStore

/** Starts the tick loop. Idempotent, so React StrictMode double-mounts are harmless. */
export function startEngine(): void {
  engine.start()
}

export function stopEngine(): void {
  engine.stop()
}

export function forceRegime(name: RegimeName): void {
  engine.forceRegime(name)
}

export function setSeed(seed: number): void {
  useStore.setState({ events: [] })
  engine.setSeed(seed)
}

/* Selector hooks — panels subscribe to slices, never to the whole snapshot. */

export const useSnapshot = (): EngineSnapshot => useStore((state) => state.snapshot)

export const useStreams = (): readonly StreamState[] =>
  useStore((state) => state.snapshot.streams)

export const useStream = (streamId: string): StreamState | undefined =>
  useStore((state) => state.snapshot.streams.find((s) => s.definition.id === streamId))

export const useRegimeName = (): RegimeName => useStore((state) => state.snapshot.regime.name)

export const useTick = (): number => useStore((state) => state.snapshot.tick)

export const useEvents = (): readonly EngineEvent[] => useStore((state) => state.events)
