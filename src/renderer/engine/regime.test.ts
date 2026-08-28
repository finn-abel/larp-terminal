import { describe, expect, it } from 'vitest'
import { createRng } from './rng'
import { advanceRegime, createRegimeState, enterRegime, REGIMES } from './regime'
import type { RegimeName } from './types'

const REGIME_NAMES = Object.keys(REGIMES) as RegimeName[]

/** Runs the machine for `seconds` of sim time, returning every regime it passed through. */
function runRegime(seed: number, seconds: number, dt = 1 / 12): RegimeName[] {
  const rng = createRng(seed)
  let state = createRegimeState(rng)
  const visited: RegimeName[] = [state.name]

  for (let elapsed = 0; elapsed < seconds; elapsed += dt) {
    const next = advanceRegime(state, dt, rng)
    if (next.name !== state.name) visited.push(next.name)
    state = next
  }
  return visited
}

describe('regime state machine', () => {
  it('starts calm with a duration inside the profile band', () => {
    const state = createRegimeState(createRng(1))
    expect(state.name).toBe('calm')
    expect(state.durationSeconds).toBeGreaterThanOrEqual(REGIMES.calm.minDurationSeconds)
    expect(state.durationSeconds).toBeLessThan(REGIMES.calm.maxDurationSeconds)
  })

  it('transitions over time', () => {
    const visited = runRegime(2026, 600)
    expect(visited.length).toBeGreaterThan(3)
  })

  it('never transitions to itself', () => {
    const visited = runRegime(7, 3000)
    for (let i = 1; i < visited.length; i += 1) {
      expect(visited[i]).not.toBe(visited[i - 1])
    }
  })

  it('reaches every regime over a long session', () => {
    const visited = new Set(runRegime(11, 6000))
    for (const name of REGIME_NAMES) expect(visited.has(name)).toBe(true)
  })

  it('keeps crashes rarer and shorter than calm', () => {
    expect(REGIMES.crash.maxDurationSeconds).toBeLessThan(REGIMES.calm.minDurationSeconds)
    const visited = runRegime(5, 12000)
    const crashes = visited.filter((name) => name === 'crash').length
    const calms = visited.filter((name) => name === 'calm').length
    expect(crashes).toBeLessThan(calms)
  })

  it('is reproducible for a given seed', () => {
    expect(runRegime(404, 900)).toEqual(runRegime(404, 900))
  })

  it('enters a forced regime immediately and counts the transition', () => {
    const rng = createRng(3)
    const state = createRegimeState(rng)
    const forced = enterRegime(state, 'crash', rng)

    expect(forced.name).toBe('crash')
    expect(forced.elapsedSeconds).toBe(0)
    expect(forced.transitions).toBe(state.transitions + 1)
  })
})
