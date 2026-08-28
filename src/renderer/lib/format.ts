import type { StreamState } from '@renderer/engine'

export const TICK_GLYPH = { up: '▲', down: '▼', flat: '·' } as const

export type Direction = keyof typeof TICK_GLYPH

/** Direction of the most recent tick, for the flickering arrows. */
export function tickDirection(stream: StreamState): Direction {
  if (stream.price > stream.previousPrice) return 'up'
  if (stream.price < stream.previousPrice) return 'down'
  return 'flat'
}

/** Direction since the session opened, for the stable row colouring. */
export function sessionDirection(stream: StreamState): Direction {
  if (stream.price > stream.open) return 'up'
  if (stream.price < stream.open) return 'down'
  return 'flat'
}

export function signed(value: number, digits = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`
}

/** mm:ss from simulated milliseconds. */
export function formatClock(milliseconds: number): string {
  const total = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(total / 60)
    .toString()
    .padStart(2, '0')
  return `${minutes}:${(total % 60).toString().padStart(2, '0')}`
}
