import { describe, expect, it } from 'vitest'
import { wanderForce } from './wanderForce'
import type { SimulationNode } from './clusterForce'

const node = (id: string): SimulationNode => ({
  id,
  label: id,
  group: 0,
  degree: 1,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0
})

describe('wanderForce', () => {
  it('nudges every node', () => {
    const nodes = [node('a'), node('b'), node('c')]
    const force = wanderForce({ amplitude: 0.1, periodSeconds: 10, now: () => 0 })
    force.initialize(nodes)
    force(1)

    for (const item of nodes) expect(Math.abs(item.vx!) + Math.abs(item.vy!)).toBeGreaterThan(0)
  })

  it('never exceeds the amplitude per axis', () => {
    const nodes = [node('a'), node('b')]
    const force = wanderForce({ amplitude: 0.1, periodSeconds: 4, now: () => clock })
    force.initialize(nodes)

    let clock = 0
    for (let step = 0; step < 200; step += 1) {
      for (const item of nodes) {
        item.vx = 0
        item.vy = 0
      }
      clock = step * 50
      force(1)
      for (const item of nodes) {
        expect(Math.abs(item.vx!)).toBeLessThanOrEqual(0.1 + 1e-12)
        expect(Math.abs(item.vy!)).toBeLessThanOrEqual(0.1 + 1e-12)
      }
    }
  })

  it('gives different nodes different phases', () => {
    const a = node('a')
    const b = node('zzz')
    const force = wanderForce({ amplitude: 0.1, periodSeconds: 10, now: () => 0 })
    force.initialize([a, b])
    force(1)

    expect(a.vx).not.toBeCloseTo(b.vx!, 6)
  })

  it('keeps a node on the same phase across re-initialisation', () => {
    const first = node('a')
    const second = node('a')

    const forceA = wanderForce({ amplitude: 0.1, periodSeconds: 10, now: () => 1234 })
    forceA.initialize([first])
    forceA(1)

    const forceB = wanderForce({ amplitude: 0.1, periodSeconds: 10, now: () => 1234 })
    forceB.initialize([node('other'), second])
    forceB(1)

    expect(second.vx).toBeCloseTo(first.vx!, 12)
  })

  it('does not cool down with alpha', () => {
    const hot = node('a')
    const cold = node('a')
    const build = (target: SimulationNode) => {
      const force = wanderForce({ amplitude: 0.1, periodSeconds: 10, now: () => 500 })
      force.initialize([target])
      return force
    }

    build(hot)(1)
    build(cold)(0.001)

    expect(cold.vx).toBeCloseTo(hot.vx!, 12)
  })
})
