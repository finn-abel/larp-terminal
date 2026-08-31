import type { SimulationNode } from './clusterForce'

export interface WanderForce {
  (alpha: number): void
  initialize: (nodes: SimulationNode[]) => void
}

export interface WanderForceOptions {
  /** Velocity added per tick at the peak of the cycle. Keep it small. */
  readonly amplitude: number
  /** Seconds for one full sway. */
  readonly periodSeconds: number
  /** Injectable clock, so the motion can be tested without waiting for real time. */
  readonly now?: () => number
}

const TAU = Math.PI * 2

/**
 * A slow per-node sway.
 *
 * Collision and cluster forces settle into a static equilibrium, which reads as frozen
 * however alive the rest of the panel is. This adds a small continuous drift on its own
 * phase per node, so the mesh breathes without the layout coming apart. It deliberately
 * ignores alpha — the point is that it never cools down.
 */
export function wanderForce(options: WanderForceOptions): WanderForce {
  const { amplitude, periodSeconds } = options
  const clock = options.now ?? (() => performance.now())
  let nodes: SimulationNode[] = []
  let phases: number[] = []

  const force = (): void => {
    const time = clock() / 1000
    const omega = TAU / periodSeconds

    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index]!
      const phase = phases[index]!
      node.vx = (node.vx ?? 0) + Math.cos(time * omega + phase) * amplitude
      // A different rate on y keeps nodes from all tracing the same circle.
      node.vy = (node.vy ?? 0) + Math.sin(time * omega * 0.77 + phase * 1.6) * amplitude
    }
  }

  force.initialize = (next: SimulationNode[]): void => {
    nodes = next
    phases = next.map((node) => hashPhase(node.id))
  }

  return force
}

/** Stable per-node phase offset in [0, TAU). */
function hashPhase(id: string): number {
  let total = 0
  for (let index = 0; index < id.length; index += 1) {
    total = (total * 31 + id.charCodeAt(index)) % 9973
  }
  return (total / 9973) * TAU
}
