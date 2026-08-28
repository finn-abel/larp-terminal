import type { Rng } from './rng'
import type { RegimeName, RegimeProfile, RegimeState } from './types'

/**
 * The drama timer (design principle 4). Calm dominates; crashes are rare and short but
 * violent, which is what makes the screen periodically flash and the alerts spike.
 */
export const REGIMES: Readonly<Record<RegimeName, RegimeProfile>> = {
  calm: {
    name: 'calm',
    code: 'NOMINAL',
    driftMultiplier: 1,
    volMultiplier: 1,
    eventRate: 0.7,
    minDurationSeconds: 30,
    maxDurationSeconds: 75,
    transitions: { calm: 0, rally: 5, crash: 1, high_vol: 4 }
  },
  rally: {
    name: 'rally',
    code: 'RISK-ON',
    driftMultiplier: 14,
    volMultiplier: 1.4,
    eventRate: 2.2,
    minDurationSeconds: 15,
    maxDurationSeconds: 40,
    transitions: { calm: 6, rally: 0, crash: 2, high_vol: 3 }
  },
  crash: {
    name: 'crash',
    code: 'DISLOCATION',
    driftMultiplier: -55,
    volMultiplier: 3.2,
    eventRate: 5.5,
    minDurationSeconds: 6,
    maxDurationSeconds: 16,
    transitions: { calm: 2, rally: 2, crash: 0, high_vol: 6 }
  },
  high_vol: {
    name: 'high_vol',
    code: 'VOL-EXPANSION',
    driftMultiplier: 0.5,
    volMultiplier: 2.4,
    eventRate: 3.4,
    minDurationSeconds: 12,
    maxDurationSeconds: 35,
    transitions: { calm: 5, rally: 3, crash: 2, high_vol: 0 }
  }
}

const REGIME_NAMES = Object.keys(REGIMES) as readonly RegimeName[]

export function createRegimeState(rng: Rng, name: RegimeName = 'calm'): RegimeState {
  return {
    name,
    elapsedSeconds: 0,
    durationSeconds: sampleDuration(REGIMES[name], rng),
    transitions: 0
  }
}

/**
 * Advances the regime timer. Returns the same state shape either way; callers compare
 * `name` before and after to detect a transition.
 */
export function advanceRegime(state: RegimeState, dtSeconds: number, rng: Rng): RegimeState {
  const elapsedSeconds = state.elapsedSeconds + dtSeconds
  if (elapsedSeconds < state.durationSeconds) {
    return { ...state, elapsedSeconds }
  }

  const next = pickNextRegime(state.name, rng)
  return {
    name: next,
    elapsedSeconds: 0,
    durationSeconds: sampleDuration(REGIMES[next], rng),
    transitions: state.transitions + 1
  }
}

/** Jumps straight to a regime — used by the command palette and demos. */
export function enterRegime(state: RegimeState, name: RegimeName, rng: Rng): RegimeState {
  return {
    name,
    elapsedSeconds: 0,
    durationSeconds: sampleDuration(REGIMES[name], rng),
    transitions: state.transitions + 1
  }
}

function pickNextRegime(current: RegimeName, rng: Rng): RegimeName {
  const weights = REGIMES[current].transitions
  const total = REGIME_NAMES.reduce((sum, name) => sum + weights[name], 0)
  let roll = rng.next() * total

  for (const name of REGIME_NAMES) {
    roll -= weights[name]
    if (roll <= 0) return name
  }
  return 'calm'
}

function sampleDuration(profile: RegimeProfile, rng: Rng): number {
  return rng.range(profile.minDurationSeconds, profile.maxDurationSeconds)
}
