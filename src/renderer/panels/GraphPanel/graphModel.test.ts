import { describe, expect, it } from 'vitest'
import { createRng } from '@renderer/engine'
import { createGraph, planReassignment, type GraphOptions } from './graphModel'

const OPTIONS: GraphOptions = { nodeCount: 60, groupCount: 5, density: 1.4, bridgeRatio: 0.15 }

describe('createGraph', () => {
  it('is reproducible for a seed', () => {
    expect(createGraph(7, OPTIONS)).toEqual(createGraph(7, OPTIONS))
  })

  it('differs for a different seed', () => {
    expect(createGraph(7, OPTIONS)).not.toEqual(createGraph(8, OPTIONS))
  })

  it('creates the requested number of nodes across the requested groups', () => {
    const graph = createGraph(1, OPTIONS)
    expect(graph.nodes).toHaveLength(60)
    expect(new Set(graph.nodes.map((node) => node.group)).size).toBe(5)
  })

  it('leaves no node unconnected', () => {
    const graph = createGraph(2, OPTIONS)
    const connected = new Set(graph.links.flatMap((link) => [link.source, link.target]))
    for (const node of graph.nodes) expect(connected.has(node.id)).toBe(true)
  })

  it('never links a node to itself or duplicates an edge', () => {
    const graph = createGraph(3, OPTIONS)
    const keys = graph.links.map((link) =>
      link.source < link.target ? `${link.source}:${link.target}` : `${link.target}:${link.source}`
    )
    expect(graph.links.every((link) => link.source !== link.target)).toBe(true)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('keeps most links inside a cluster', () => {
    const graph = createGraph(4, OPTIONS)
    const bridges = graph.links.filter((link) => link.bridge).length
    expect(bridges).toBeGreaterThan(0)
    expect(bridges).toBeLessThan(graph.links.length / 2)
  })

  it('reports a degree for every node that matches its links', () => {
    const graph = createGraph(5, OPTIONS)
    const counts = new Map<string, number>()
    for (const link of graph.links) {
      counts.set(link.source, (counts.get(link.source) ?? 0) + 1)
      counts.set(link.target, (counts.get(link.target) ?? 0) + 1)
    }
    for (const node of graph.nodes) expect(node.degree).toBe(counts.get(node.id) ?? 0)
  })

  it('survives degenerate options', () => {
    const tiny = createGraph(1, { ...OPTIONS, nodeCount: 1, groupCount: 9 })
    expect(tiny.nodes.length).toBeGreaterThanOrEqual(2)

    const single = createGraph(1, { ...OPTIONS, groupCount: 1 })
    expect(new Set(single.nodes.map((node) => node.group))).toEqual(new Set([0]))
  })
})

describe('planReassignment', () => {
  const graph = createGraph(11, OPTIONS)

  it('moves the requested number of nodes', () => {
    const plan = planReassignment(graph.nodes, createRng(1), graph.groupCount, 8)
    expect(plan.size).toBe(8)
  })

  it('always moves a node to a different group', () => {
    const plan = planReassignment(graph.nodes, createRng(2), graph.groupCount, 20)
    for (const [id, group] of plan) {
      const node = graph.nodes.find((candidate) => candidate.id === id)!
      expect(group).not.toBe(node.group)
      expect(group).toBeGreaterThanOrEqual(0)
      expect(group).toBeLessThan(graph.groupCount)
    }
  })

  it('is reproducible for a seed', () => {
    const a = planReassignment(graph.nodes, createRng(3), graph.groupCount, 10)
    const b = planReassignment(graph.nodes, createRng(3), graph.groupCount, 10)
    expect([...a]).toEqual([...b])
  })

  it('cannot move more nodes than exist', () => {
    const plan = planReassignment(graph.nodes, createRng(4), graph.groupCount, 5000)
    expect(plan.size).toBeLessThanOrEqual(graph.nodes.length)
  })

  it('does nothing when there is only one group', () => {
    expect(planReassignment(graph.nodes, createRng(5), 1, 10).size).toBe(0)
  })
})
