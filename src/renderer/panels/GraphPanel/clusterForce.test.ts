import { describe, expect, it } from 'vitest'
import { clusterForce, type SimulationNode } from './clusterForce'

const node = (id: string, group: number, x: number, y: number): SimulationNode => ({
  id,
  label: id,
  group,
  degree: 1,
  x,
  y,
  vx: 0,
  vy: 0
})

describe('clusterForce', () => {
  it('accelerates a node toward its own group centroid', () => {
    const stray = node('a', 0, 100, 0)
    const force = clusterForce({ strength: 0.5 })
    force.initialize([stray, node('b', 0, 0, 0), node('c', 0, 0, 0)])
    force(1)

    expect(stray.vx!).toBeLessThan(0)
    expect(stray.vy!).toBe(0)
  })

  it('ignores nodes in other groups', () => {
    const target = node('a', 0, 10, 0)
    const force = clusterForce({ strength: 0.5 })
    force.initialize([target, node('b', 1, -1000, 0)])
    force(1)

    expect(target.vx!).toBeCloseTo(0, 10)
  })

  it('scales with alpha, so a cooling simulation settles', () => {
    const hot = node('a', 0, 100, 0)
    const cold = node('a', 0, 100, 0)

    const hotForce = clusterForce({ strength: 0.5 })
    hotForce.initialize([hot, node('b', 0, 0, 0)])
    hotForce(1)

    const coldForce = clusterForce({ strength: 0.5 })
    coldForce.initialize([cold, node('b', 0, 0, 0)])
    coldForce(0.1)

    expect(Math.abs(hot.vx!)).toBeGreaterThan(Math.abs(cold.vx!) * 5)
  })

  it('pulls a boosted node harder than an unboosted one', () => {
    const plain = node('a', 0, 100, 0)
    const boosted = node('a', 0, 100, 0)

    const plainForce = clusterForce({ strength: 0.5 })
    plainForce.initialize([plain, node('b', 0, 0, 0)])
    plainForce(1)

    const boostedForce = clusterForce({
      strength: 0.5,
      boostFor: (candidate) => (candidate.id === 'a' ? 3 : 1)
    })
    boostedForce.initialize([boosted, node('b', 0, 0, 0)])
    boostedForce(1)

    expect(Math.abs(boosted.vx!)).toBeCloseTo(Math.abs(plain.vx!) * 3, 6)
  })

  describe('anchors', () => {
    const anchors = new Map([
      [0, { x: -100, y: 0 }],
      [1, { x: 100, y: 0 }]
    ])
    const anchorFor = (group: number) => anchors.get(group)

    it('pulls a group toward its anchor even when every centroid coincides', () => {
      // The soup case: both groups piled on the origin, so centroids are identical.
      const left = node('a', 0, 0, 0)
      const right = node('b', 1, 0, 0)

      const force = clusterForce({ strength: 0.5, anchorFor, anchorMix: 1 })
      force.initialize([left, right])
      force(1)

      expect(left.vx!).toBeLessThan(0)
      expect(right.vx!).toBeGreaterThan(0)
    })

    it('blends anchor and centroid by the mix', () => {
      const build = (mix: number): SimulationNode => {
        const target = node('a', 0, 0, 0)
        const force = clusterForce({ strength: 0.5, anchorFor, anchorMix: mix })
        force.initialize([target, node('b', 0, 0, 0)])
        force(1)
        return target
      }

      const half = build(0.5)
      const full = build(1)
      expect(Math.abs(half.vx!)).toBeCloseTo(Math.abs(full.vx!) / 2, 6)
    })

    it('falls back to the centroid when a group has no anchor', () => {
      const stray = node('a', 9, 100, 0)
      const force = clusterForce({ strength: 0.5, anchorFor, anchorMix: 1 })
      force.initialize([stray, node('b', 9, 0, 0)])
      force(1)

      expect(stray.vx!).toBeLessThan(0)
    })

    it('sends a reassigned node toward its new anchor', () => {
      const traveller = node('a', 0, -100, 0)
      const force = clusterForce({ strength: 0.5, anchorFor, anchorMix: 1 })
      force.initialize([traveller, node('b', 0, -100, 0)])

      traveller.group = 1
      force(1)

      expect(traveller.vx!).toBeGreaterThan(0)
    })
  })

  it('tolerates nodes the simulation has not positioned yet', () => {
    const unplaced: SimulationNode = { id: 'a', label: 'a', group: 0, degree: 0 }
    const force = clusterForce({ strength: 0.5 })
    force.initialize([unplaced, node('b', 0, 10, 10)])

    expect(() => force(1)).not.toThrow()
  })
})
