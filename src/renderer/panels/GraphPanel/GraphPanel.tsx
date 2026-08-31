import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d'
import { forceCollide } from 'd3-force'
import { createRng, REGIMES } from '@renderer/engine'
import { engine, useRegimeName } from '@renderer/store/useMarketStore'
import { readToken } from '@renderer/lib/tokens'
import type { PanelProps } from '@renderer/layout/panelRegistry'
import { createGraph, planReassignment, type GraphLink } from './graphModel'
import { clusterForce, type SimulationNode } from './clusterForce'
import { wanderForce } from './wanderForce'
import './graph-panel.css'

export interface GraphConfig {
  readonly nodeCount: number
  /** Seconds between one node being launched at a different cluster. */
  readonly reassignSeconds: number
  readonly glow: boolean
  /** Draws each node's collision radius — a debug aid for the layout spacing. */
  readonly rings?: boolean
}

const GROUP_COUNT = 6
const DENSITY = 2.3
const BRIDGE_RATIO = 0.17
/**
 * The invisible radius every node claims, in simulation units. It is uniform on purpose:
 * a degree-scaled radius packs unevenly, and even spacing is what makes the mesh read as
 * a lattice rather than a clump.
 */
const SPACING = 15
/** How long a migrating node stays boosted, enlarged and streaked. */
const TRANSIT_MS = 7000
/** Launch speed given to a node when it is sent to another cluster. Deliberately slow. */
const LAUNCH_SPEED = 0.55
/** Beyond this distance from its cluster anchor, a node is treated as a stray. */
const STRAY_DISTANCE = 95
/** Framing ignores nodes further than this multiple of the ring radius from the centre. */
const FRAME_OUTLIER_FACTOR = 1.9
const FLARE_MS = 1100
const NODE_COUNTS = [60, 120, 240, 400] as const
const REASSIGN_CHOICES = [1, 2, 4] as const
/** How often the view re-frames itself. */
const REFRAME_MS = 12_000
/** Seconds for the anchor ring to complete one slow revolution. */
const ROTATION_SECONDS = 110

export function GraphPanel({ config, setConfig }: PanelProps<GraphConfig>): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<ForceGraphMethods<SimulationNode, GraphLink> | undefined>(undefined)
  /** node id -> performance.now() when the flare started. */
  const flaresRef = useRef(new Map<string, number>())
  /** node id -> performance.now() when it started crossing to a new cluster. */
  const transitRef = useRef(new Map<string, number>())
  const rngRef = useRef(createRng(0x5eed))
  /** Once the viewer zooms or pans, auto-framing gets out of their way for good. */
  const userAdjustedRef = useRef(false)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const regime = useRegimeName()

  // Node objects are handed to d3-force, which owns their positions from then on, so
  // the graph is rebuilt only when the node count actually changes.
  const graph = useMemo(() => {
    const model = createGraph(0x1a2b, {
      nodeCount: config.nodeCount,
      groupCount: GROUP_COUNT,
      density: DENSITY,
      bridgeRatio: BRIDGE_RATIO
    })
    return {
      nodes: model.nodes.map((node) => ({ ...node })) as SimulationNode[],
      links: model.links.map((link) => ({ ...link }))
    }
  }, [config.nodeCount])

  /**
   * Visual radius, expressed against the spacing so nodes always read as a dense mesh
   * rather than specks in a void. Degree only nudges it.
   */
  const nodeRadius = useCallback(
    (node: SimulationNode): number => SPACING * 0.4 + Math.min(2.6, node.degree * 0.32),
    []
  )

  const ringRadius = useMemo(() => 150 + Math.sqrt(graph.nodes.length) * 21, [graph.nodes.length])

  /**
   * Panels are rarely square. Stretching the anchor ring into an ellipse that matches
   * the pane keeps the mesh filling the space instead of fitting a circle into the
   * short axis and leaving the rest empty.
   */
  const ringScale = useMemo(() => {
    if (size.width === 0 || size.height === 0) return { x: 1, y: 1 }
    const aspect = Math.min(3, Math.max(1 / 3, size.width / size.height))
    return { x: Math.sqrt(aspect), y: 1 / Math.sqrt(aspect) }
  }, [size.width, size.height])

  /**
   * Frames the mesh, ignoring anything flung far outside the ring. A single stray node
   * otherwise inflates the bounding box and shrinks the whole graph to a speck.
   */
  const frame = useCallback(
    (duration: number) => {
      const limit = ringRadius * FRAME_OUTLIER_FACTOR
      graphRef.current?.zoomToFit(duration, 28, (node) =>
        Math.hypot((node.x ?? 0) / ringScale.x, (node.y ?? 0) / ringScale.y) <= limit
      )
    },
    [ringRadius, ringScale]
  )

  /** Where a cluster lives: a slowly turning ring, one seat per group. */
  const anchorFor = useCallback(
    (group: number): { x: number; y: number } => {
      const turn = (performance.now() / 1000 / ROTATION_SECONDS) * Math.PI * 2
      const angle = turn + (group / GROUP_COUNT) * Math.PI * 2
      return {
        x: Math.cos(angle) * ringRadius * ringScale.x,
        y: Math.sin(angle) * ringRadius * ringScale.y
      }
    },
    [ringRadius, ringScale]
  )

  const palette = useMemo(
    () =>
      Array.from({ length: GROUP_COUNT }, (_, index) =>
        readToken(`--color-cluster-${index + 1}`, '#ffae00')
      ),
    []
  )

  const flare = useCallback((ids: readonly string[]) => {
    const now = performance.now()
    for (const id of ids) flaresRef.current.set(id, now)
  }, [])

  const flareRandom = useCallback(
    (count: number) => {
      const ids: string[] = []
      for (let i = 0; i < count; i += 1) {
        const node = graph.nodes[rngRef.current.int(graph.nodes.length)]
        if (node) ids.push(node.id)
      }
      flare(ids)
    },
    [flare, graph.nodes]
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const markAdjusted = (): void => {
      userAdjustedRef.current = true
    }
    container.addEventListener('wheel', markAdjusted, { passive: true })
    container.addEventListener('mousedown', markAdjusted)

    let refit: ReturnType<typeof setTimeout> | null = null
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      setSize({
        width: Math.max(1, Math.floor(entry.contentRect.width)),
        height: Math.max(1, Math.floor(entry.contentRect.height))
      })
      if (refit) clearTimeout(refit)
      if (!userAdjustedRef.current) refit = setTimeout(() => frame(400), 250)
    })
    observer.observe(container)

    // Clusters migrate, so the mesh's bounding box grows and shrinks over time.
    const reframe = setInterval(() => {
      if (!userAdjustedRef.current) frame(900)
    }, REFRAME_MS)

    return () => {
      observer.disconnect()
      clearInterval(reframe)
      if (refit) clearTimeout(refit)
      container.removeEventListener('wheel', markAdjusted)
      container.removeEventListener('mousedown', markAdjusted)
    }
  }, [frame])

  // Forces: repulsion and links come from d3, clustering is ours.
  useEffect(() => {
    const instance = graphRef.current
    if (!instance) return

    // Spacing is entirely the collision force's job. Charge is off and links are very
    // weak, because both of them pull connected nodes into clumps and the even lattice
    // is the look we want.
    instance.d3Force('charge', null)
    instance.d3Force('center', null)
    instance.d3Force('link')?.distance(SPACING * 2.4).strength(0.025)
    instance.d3Force(
      'collide',
      forceCollide<SimulationNode>().radius(SPACING).strength(1).iterations(2)
    )
    instance.d3Force(
      'cluster',
      clusterForce({
        strength: 0.06,
        anchorMix: 0.75,
        anchorFor,
        boostFor: (node) => {
          const started = transitRef.current.get(node.id)
          if (started !== undefined && performance.now() - started < TRANSIT_MS) return 4

          // Homing: a node whose old links stalled it short of its cluster keeps a mild
          // extra pull until it arrives, so strays never litter the gaps.
          const anchor = anchorFor(node.group)
          const distance = Math.hypot(anchor.x - (node.x ?? 0), anchor.y - (node.y ?? 0))
          return distance > STRAY_DISTANCE ? 3 : 1
        }
      })
    )
    // Keeps the settled lattice breathing instead of standing perfectly still.
    instance.d3Force('wander', wanderForce({ amplitude: 0.22, periodSeconds: 10 }))
    instance.d3ReheatSimulation()

    // Let the layout spread before framing it, otherwise it fits a tight initial blob.
    const timer = setTimeout(() => frame(700), 1400)
    return () => clearTimeout(timer)
  }, [graph, anchorFor, nodeRadius, frame])

  /**
   * The migration: with the mesh holding still, one node at a time is reassigned and
   * physically launched at its new cluster. That single traveller is the whole effect.
   */
  useEffect(() => {
    const interval = setInterval(
      () => {
        const plan = planReassignment(graph.nodes, rngRef.current, GROUP_COUNT, 1)
        const now = performance.now()

        for (const node of graph.nodes) {
          const next = plan.get(node.id)
          if (next === undefined) continue

          node.group = next
          transitRef.current.set(node.id, now)

          // Aim it at the new cluster so the crossing is a visible flight, not a drift.
          const anchor = anchorFor(next)
          const dx = anchor.x - (node.x ?? 0)
          const dy = anchor.y - (node.y ?? 0)
          const distance = Math.hypot(dx, dy) || 1
          node.vx = (dx / distance) * LAUNCH_SPEED
          node.vy = (dy / distance) * LAUNCH_SPEED
        }

        // Drop expired entries so the maps do not grow for the life of the panel.
        for (const [id, started] of transitRef.current) {
          if (now - started > TRANSIT_MS) transitRef.current.delete(id)
        }
        for (const [id, started] of flaresRef.current) {
          if (now - started > FLARE_MS) flaresRef.current.delete(id)
        }
      },
      Math.max(1, config.reassignSeconds) * 1000
    )

    return () => clearInterval(interval)
  }, [graph, config.reassignSeconds, anchorFor])

  // Engine events light up nodes; a regime shift sets off a burst.
  useEffect(() => {
    return engine.subscribeEvents((events) => {
      for (const event of events) {
        if (event.kind === 'regime_shift') {
          flareRandom(Math.ceil(graph.nodes.length * 0.3))
          graphRef.current?.d3ReheatSimulation()
          continue
        }
        flareRandom(1)
      }
    })
  }, [flareRandom, graph.nodes.length])

  const drawNode = useCallback(
    (node: SimulationNode, ctx: CanvasRenderingContext2D, scale: number): void => {
      if (node.x === undefined || node.y === undefined) return

      const now = performance.now()
      const color = palette[node.group % palette.length]!
      const transitAge = now - (transitRef.current.get(node.id) ?? -Infinity)
      const inTransit = transitAge >= 0 && transitAge < TRANSIT_MS
      const base = nodeRadius(node)
      const radius = base * (inTransit ? 1.5 : 1)

      // Debug view of the invisible space each node claims.
      if (config.rings) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(node.x, node.y, SPACING, 0, Math.PI * 2)
        ctx.strokeStyle = color
        ctx.globalAlpha = 0.18
        ctx.lineWidth = 0.6 / scale
        ctx.stroke()
        ctx.restore()
      }
      const flareAge = now - (flaresRef.current.get(node.id) ?? -Infinity)
      const flaring = flareAge >= 0 && flareAge < FLARE_MS
      const flareStrength = flaring ? 1 - flareAge / FLARE_MS : 0

      ctx.save()
      if (config.glow) {
        ctx.shadowBlur = (flaring ? 16 : 7) * flareStrength + (inTransit ? 12 : 5)
        ctx.shadowColor = color
      }

      // A streak behind a migrating node, so the crossing reads as travel.
      if (inTransit) {
        const vx = node.vx ?? 0
        const vy = node.vy ?? 0
        if (Math.abs(vx) + Math.abs(vy) > 0.02) {
          ctx.beginPath()
          ctx.moveTo(node.x - vx * 5, node.y - vy * 5)
          ctx.lineTo(node.x, node.y)
          ctx.strokeStyle = color
          ctx.globalAlpha = 0.5
          ctx.lineWidth = radius * 0.7
          ctx.lineCap = 'round'
          ctx.stroke()
        }
      }

      ctx.beginPath()
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.globalAlpha = inTransit ? 1 : 0.78 + flareStrength * 0.22
      ctx.fill()

      if (flaring) {
        ctx.beginPath()
        ctx.arc(node.x, node.y, radius + 10 * (1 - flareStrength), 0, Math.PI * 2)
        ctx.strokeStyle = color
        ctx.globalAlpha = flareStrength * 0.7
        ctx.lineWidth = 1 / scale
        ctx.stroke()
      }
      ctx.restore()

      // Labels would be noise on a zoomed-out graph, so only the biggest hubs keep
      // theirs until the viewer zooms in.
      if (scale > 2.2 || node.degree >= 13) {
        ctx.save()
        ctx.font = `${7 / scale}px ${readToken('--font-mono', 'monospace')}`
        ctx.fillStyle = readToken('--color-text-dim', '#6c7a8a')
        ctx.globalAlpha = 0.75
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(node.label, node.x, node.y + radius + 2 / scale)
        ctx.restore()
      }
    },
    [config.glow, config.rings, palette, nodeRadius]
  )

  const linkColor = useCallback(
    (link: GraphLink): string => {
      // A slow travelling pulse, offset per link so the whole mesh never blinks at once.
      const phase = (performance.now() / 900 + hash(link.source + link.target)) % 1
      const alpha = 0.1 + Math.abs(Math.sin(phase * Math.PI)) * (link.bridge ? 0.5 : 0.22)
      return link.bridge
        ? `rgba(255, 174, 0, ${alpha.toFixed(3)})`
        : `rgba(140, 160, 180, ${alpha.toFixed(3)})`
    },
    []
  )

  return (
    <div className="graph">
      <header className="graph__head">
        <span className="graph__title">CLUSTER MESH</span>
        <span className="graph__meta">{graph.nodes.length} NODES</span>
        <span className="graph__meta">{graph.links.length} EDGES</span>
        <span className={`graph__regime graph__regime--${regime}`}>{REGIMES[regime].code}</span>
      </header>

      <div className="graph__canvas" ref={containerRef}>
        {size.width > 0 ? (
          <ForceGraph2D
            ref={graphRef}
            width={size.width}
            height={size.height}
            graphData={graph}
            backgroundColor="transparent"
            cooldownTicks={Infinity}
            d3AlphaDecay={0}
            d3VelocityDecay={0.55}
            warmupTicks={40}
            autoPauseRedraw={false}
            enableNodeDrag={false}
            enablePointerInteraction={false}
            nodeCanvasObject={drawNode}
            linkColor={linkColor}
            linkWidth={(link) => (link.bridge ? 0.7 : 0.4)}
            linkDirectionalParticles={(link) => (link.bridge ? 2 : 0)}
            linkDirectionalParticleWidth={1.2}
            linkDirectionalParticleSpeed={0.006}
            linkDirectionalParticleColor={() => readToken('--color-accent', '#ffae00')}
          />
        ) : null}
      </div>

      <div className="panel-controls">
        <label className="panel-control">
          <span className="panel-control__label">NODES</span>
          <select
            value={config.nodeCount}
            onChange={(event) => setConfig({ ...config, nodeCount: Number(event.target.value) })}
          >
            {NODE_COUNTS.map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </label>

        <label className="panel-control">
          <span className="panel-control__label">LAUNCH</span>
          <select
            value={config.reassignSeconds}
            onChange={(event) =>
              setConfig({ ...config, reassignSeconds: Number(event.target.value) })
            }
          >
            {REASSIGN_CHOICES.map((seconds) => (
              <option key={seconds} value={seconds}>
                {seconds}S
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="panel-button panel-button--end"
          aria-pressed={config.rings === true}
          onClick={() => setConfig({ ...config, rings: !config.rings })}
          title="Show each node's collision radius"
        >
          RINGS {config.rings ? 'ON' : 'OFF'}
        </button>

        <button
          type="button"
          className="panel-button"
          aria-pressed={config.glow}
          onClick={() => setConfig({ ...config, glow: !config.glow })}
        >
          GLOW {config.glow ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  )
}

/** Stable 0-1 offset from a string, so each link pulses on its own phase. */
function hash(value: string): number {
  let total = 0
  for (let index = 0; index < value.length; index += 1) {
    total = (total * 31 + value.charCodeAt(index)) % 997
  }
  return total / 997
}
