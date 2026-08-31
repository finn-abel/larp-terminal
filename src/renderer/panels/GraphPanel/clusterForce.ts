import type { GraphNode } from './graphModel'

/** A node once d3-force has taken ownership of it. */
export interface SimulationNode extends GraphNode {
  x?: number
  y?: number
  vx?: number
  vy?: number
}

export interface ClusterForce {
  (alpha: number): void
  initialize: (nodes: SimulationNode[]) => void
}

export interface ClusterForceOptions {
  readonly strength: number
  /**
   * Fixed position for a group, evaluated every tick.
   *
   * Centroid-only clustering has a failure mode: once groups intermix, every centroid
   * collapses onto the same point and there is nothing left to pull clusters apart, so
   * the graph stays a soup forever. Anchoring each group to its own place keeps the
   * clusters separated and gives a reassigned node somewhere visible to travel to.
   */
  readonly anchorFor?: (group: number) => { x: number; y: number } | undefined
  /** 0 = pure centroid, 1 = pure anchor. */
  readonly anchorMix?: number
  /** Per-node multiplier — used to shove migrating nodes across the gap decisively. */
  readonly boostFor?: (node: SimulationNode) => number
}

export function clusterForce(options: ClusterForceOptions): ClusterForce {
  const { strength, anchorFor, boostFor } = options
  const anchorMix = Math.min(1, Math.max(0, options.anchorMix ?? 0))
  let nodes: SimulationNode[] = []

  const force = (alpha: number): void => {
    const sums = new Map<number, { x: number; y: number; count: number }>()

    for (const node of nodes) {
      if (node.x === undefined || node.y === undefined) continue
      const sum = sums.get(node.group) ?? { x: 0, y: 0, count: 0 }
      sum.x += node.x
      sum.y += node.y
      sum.count += 1
      sums.set(node.group, sum)
    }

    for (const node of nodes) {
      if (node.x === undefined || node.y === undefined) continue
      const sum = sums.get(node.group)
      if (!sum || sum.count === 0) continue

      const centroidX = sum.x / sum.count
      const centroidY = sum.y / sum.count
      const anchor = anchorFor?.(node.group)
      const mix = anchor ? anchorMix : 0
      const targetX = centroidX * (1 - mix) + (anchor?.x ?? 0) * mix
      const targetY = centroidY * (1 - mix) + (anchor?.y ?? 0) * mix

      const pull = strength * alpha * (boostFor?.(node) ?? 1)
      node.vx = (node.vx ?? 0) + (targetX - node.x) * pull
      node.vy = (node.vy ?? 0) + (targetY - node.y) * pull
    }
  }

  force.initialize = (next: SimulationNode[]): void => {
    nodes = next
  }

  return force
}
