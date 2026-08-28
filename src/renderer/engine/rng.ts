/** Seeded pseudo-random number generator. No React, no globals — see Appendix A. */

export interface Rng {
  /** Uniform in [0, 1). */
  next(): number
  /** Standard normal (mean 0, sd 1) via Box-Muller. */
  normal(): number
  /** Integer in [0, maxExclusive). */
  int(maxExclusive: number): number
  /** Uniform in [min, max). */
  range(min: number, max: number): number
  /** Uniformly picks one item. */
  pick<T>(items: readonly T[]): T
}

/** Turns a human-readable seed into the 32-bit integer mulberry32 expects. */
export function hashSeed(text: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/**
 * mulberry32 — small, fast, and good enough for simulated market noise. The generator
 * owns a single mutable word of state; everything downstream of it stays pure.
 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0
  let spareNormal: number | null = null

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const normal = (): number => {
    if (spareNormal !== null) {
      const value = spareNormal
      spareNormal = null
      return value
    }
    // Guard against log(0); next() can return exactly 0.
    const u1 = next() || Number.EPSILON
    const u2 = next()
    const magnitude = Math.sqrt(-2 * Math.log(u1))
    spareNormal = magnitude * Math.sin(2 * Math.PI * u2)
    return magnitude * Math.cos(2 * Math.PI * u2)
  }

  return {
    next,
    normal,
    int: (maxExclusive) => Math.floor(next() * maxExclusive),
    range: (min, max) => min + next() * (max - min),
    pick: (items) => items[Math.floor(next() * items.length)]!
  }
}
