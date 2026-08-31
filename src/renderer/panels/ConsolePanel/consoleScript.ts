import { createRng, type Rng } from '@renderer/engine'
import type { RegimeName } from '@renderer/engine'

/**
 * Generates the fake analysis the console types out. Seeded and pure so the same
 * session replays identically, and so the phrasing can be tested without a DOM.
 */

export interface ConsoleLine {
  readonly prompt: string
  readonly text: string
  /** Rendered dim, as if it were command output rather than input. */
  readonly output: boolean
}

const COMMANDS: readonly string[] = [
  'run corr-matrix --window 240 --method spearman',
  'fit garch(1,1) --series {sym} --refresh',
  'solve allocation --risk-budget 0.14 --lock {sym}',
  'scan liquidity --venues 9 --depth 5',
  'replay tape --from -00:15 --speed 8x',
  'calibrate factor-model --factors 5 --shrink ledoit',
  'stream greeks --book PRIME --tenor 30d',
  'audit fills --desk {desk} --tolerance 4bps'
]

const OUTPUTS: readonly string[] = [
  'residual dispersion {n1} · within tolerance',
  '{n2} eigenvalues retained · explained variance {pct}%',
  'no arbitrage detected across {n3} venues',
  'hedge ratio adjusted to {ratio}',
  'latency budget consumed {pct}% · nominal',
  'checkpoint written · {n3} rows'
]

const CRASH_OUTPUTS: readonly string[] = [
  'WARN dispersion breach · widening bands',
  'WARN venue {n3} depth collapsed · rerouting',
  'WARN drawdown limit approached · {pct}% of budget',
  'WARN correlation → 1.00 · diversification lost'
]

const DESKS = ['LDN-3', 'NY-11', 'TOK-2', 'HKG-7', 'ZRH-1'] as const

export interface ScriptContext {
  readonly regime: RegimeName
  readonly symbols: readonly string[]
}

/** Produces the next command and its output. */
export function nextExchange(rng: Rng, context: ScriptContext): readonly ConsoleLine[] {
  const symbol = context.symbols.length > 0 ? rng.pick(context.symbols) : 'QVNX'
  const command = fill(rng.pick(COMMANDS), rng, symbol)

  const stressed = context.regime === 'crash' || context.regime === 'high_vol'
  const pool = stressed && rng.next() < 0.7 ? CRASH_OUTPUTS : OUTPUTS

  return [
    { prompt: '$', text: command, output: false },
    { prompt: ' ', text: fill(rng.pick(pool), rng, symbol), output: true }
  ]
}

export function createScriptRng(seed: number): Rng {
  return createRng(seed)
}

function fill(template: string, rng: Rng, symbol: string): string {
  return template
    .replace('{sym}', symbol)
    .replace('{desk}', rng.pick(DESKS))
    .replace('{n1}', (rng.next() * 0.9 + 0.05).toFixed(3))
    .replace('{n2}', String(rng.int(9) + 2))
    .replace('{n3}', String(rng.int(40) + 6))
    .replace('{pct}', String(rng.int(60) + 20))
    .replace('{ratio}', (rng.next() * 1.4 + 0.2).toFixed(2))
}
