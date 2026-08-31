import { createRng, DEFAULT_SYMBOLS, type Rng } from '@renderer/engine'

/**
 * Graph generation and group churn. Pure and seeded, like the engine — the panel owns
 * the live simulation, this module only decides what the topology should be.
 */

export interface GraphNode {
  readonly id: string
  readonly label: string
  /** Cluster membership. The panel mutates this in place; see `planReassignment`. */
  group: number
  /** Link count, used for node sizing. */
  readonly degree: number
}

export interface GraphLink {
  readonly source: string
  readonly target: string
  /** Intra-cluster links are drawn stronger than the bridges between clusters. */
  readonly bridge: boolean
}

export interface GraphModel {
  readonly nodes: readonly GraphNode[]
  readonly links: readonly GraphLink[]
  readonly groupCount: number
}

export interface GraphOptions {
  readonly nodeCount: number
  readonly groupCount: number
  /** Average intra-cluster links per node. */
  readonly density: number
  /** Share of links that jump between clusters. */
  readonly bridgeRatio: number
}

const ENTITY_PREFIXES = ['NODE', 'DESK', 'RELAY', 'VAULT', 'GRID', 'MESH'] as const

export function createGraph(seed: number, options: GraphOptions): GraphModel {
  const rng = createRng(seed)
  const nodeCount = Math.max(2, Math.floor(options.nodeCount))
  const groupCount = Math.max(1, Math.min(Math.floor(options.groupCount), nodeCount))

  const groups = Array.from({ length: nodeCount }, (_, index) => index % groupCount)
  const labels = groups.map(() => makeLabel(rng))
  const degrees = new Array<number>(nodeCount).fill(0)
  const links: GraphLink[] = []
  const seen = new Set<string>()

  const connect = (a: number, b: number, bridge: boolean): void => {
    if (a === b) return
    const key = a < b ? `${a}:${b}` : `${b}:${a}`
    if (seen.has(key)) return
    seen.add(key)
    degrees[a] += 1
    degrees[b] += 1
    links.push({ source: `n${a}`, target: `n${b}`, bridge })
  }

  // Chain every cluster together first so no node is left floating.
  const byGroup = new Map<number, number[]>()
  for (let index = 0; index < nodeCount; index += 1) {
    const members = byGroup.get(groups[index]!) ?? []
    members.push(index)
    byGroup.set(groups[index]!, members)
  }
  for (const members of byGroup.values()) {
    for (let i = 1; i < members.length; i += 1) connect(members[i - 1]!, members[i]!, false)
  }

  const extra = Math.round(nodeCount * options.density)
  for (let i = 0; i < extra; i += 1) {
    const bridge = rng.next() < options.bridgeRatio
    const a = rng.int(nodeCount)
    const members = byGroup.get(groups[a]!) ?? [a]
    const b = bridge ? rng.int(nodeCount) : members[rng.int(members.length)]!
    connect(a, b, bridge)
  }

  const nodes = groups.map((group, index) => ({
    id: `n${index}`,
    label: labels[index]!,
    group,
    degree: degrees[index]!
  }))

  return { nodes, links, groupCount }
}

/**
 * Picks nodes to move to a different cluster. Returns `id -> new group` rather than new
 * nodes, because the running simulation owns the node objects and their positions —
 * replacing them would reset the layout instead of letting the nodes migrate.
 */
export function planReassignment(
  nodes: readonly GraphNode[],
  rng: Rng,
  groupCount: number,
  count: number
): ReadonlyMap<string, number> {
  const plan = new Map<string, number>()
  if (nodes.length === 0 || groupCount < 2) return plan

  const wanted = Math.max(0, Math.min(count, nodes.length))
  let guard = wanted * 8

  while (plan.size < wanted && guard > 0) {
    guard -= 1
    const node = nodes[rng.int(nodes.length)]!
    if (plan.has(node.id)) continue

    // Always land somewhere new, otherwise a "reassignment" can be a no-op.
    const offset = 1 + rng.int(groupCount - 1)
    plan.set(node.id, (node.group + offset) % groupCount)
  }

  return plan
}

function makeLabel(rng: Rng): string {
  const roll = rng.next()
  if (roll < 0.34) {
    return `0x${rng
      .int(0xffff)
      .toString(16)
      .toUpperCase()
      .padStart(4, '0')}`
  }
  if (roll < 0.67) {
    return `${rng.pick(ENTITY_PREFIXES)}-${(rng.int(89) + 10).toString()}`
  }
  return rng.pick(DEFAULT_SYMBOLS).symbol
}
