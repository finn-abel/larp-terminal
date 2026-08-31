import { REGIMES, type RegimeName } from '@renderer/engine'

/**
 * A plausible round-trip figure. Derived from the tick counter rather than a random
 * source so it wanders smoothly and reproduces with the seed, and it degrades under
 * stressed regimes because that is what sells the drama.
 */
export function latencyFor(tick: number, regime: RegimeName): number {
  const stress = REGIMES[regime].volMultiplier
  const wobble = Math.sin(tick / 37) * 0.6 + Math.sin(tick / 11) * 0.35
  return Math.max(0.4, 1.8 * stress + wobble)
}

/** Four bars, filled according to how healthy the link looks. */
export function signalBars(latencyMs: number): number {
  if (latencyMs < 2.5) return 4
  if (latencyMs < 4) return 3
  if (latencyMs < 6) return 2
  return 1
}
