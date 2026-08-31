import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { MatrixConfig } from '@renderer/panels/MatrixPanel/MatrixPanel'
import type { QuoteConfig } from '@renderer/panels/QuotePanel/QuotePanel'
import type { ChartConfig } from '@renderer/panels/ChartPanel/ChartPanel'
import type { GraphConfig } from '@renderer/panels/GraphPanel/GraphPanel'
import type { TickerConfig } from '@renderer/panels/TickerPanel/TickerPanel'
import type { AlertsConfig } from '@renderer/panels/AlertsPanel/AlertsPanel'
import type { BigNumberConfig } from '@renderer/panels/BigNumberPanel/BigNumberPanel'
import type { HeatmapConfig } from '@renderer/panels/HeatmapPanel/HeatmapPanel'
import type { ConsoleConfig } from '@renderer/panels/ConsolePanel/ConsolePanel'
import { DEFAULT_SYMBOLS } from '@renderer/engine'

export interface PanelProps<TConfig> {
  readonly config: TConfig
  /** Persists a new config on the panel; the workspace serializes it with the layout. */
  readonly setConfig: (next: TConfig) => void
}

/**
 * Panels load on demand. Charting and force-graph libraries are heavy, and a workspace
 * only pays for the panels it actually opens — which also keeps this registry importable
 * from a plain Node context, where those libraries touch `window` at module scope.
 */
export type PanelComponent<TConfig> = LazyExoticComponent<ComponentType<PanelProps<TConfig>>>

export interface PanelDefinition<TConfig> {
  /** Stable key used in serialized workspaces. Never rename one in place. */
  readonly type: string
  readonly displayName: string
  readonly component: PanelComponent<TConfig>
  readonly defaultConfig: TConfig
  /** Optional suffix for the tab title, e.g. the configured symbol. */
  readonly describe?: (config: TConfig) => string
}

/**
 * Config types differ per panel, so the registry stores them erased. This is the one
 * place that cast happens; every panel keeps its own typed config at the definition
 * site and at the call site inside its component.
 */
function definePanel<TConfig>(definition: PanelDefinition<TConfig>): PanelDefinition<unknown> {
  return definition as PanelDefinition<unknown>
}

const [firstSymbol] = DEFAULT_SYMBOLS

const MatrixPanel = lazy(async () => ({
  default: (await import('@renderer/panels/MatrixPanel/MatrixPanel')).MatrixPanel
}))
const ChartPanel = lazy(async () => ({
  default: (await import('@renderer/panels/ChartPanel/ChartPanel')).ChartPanel
}))
const GraphPanel = lazy(async () => ({
  default: (await import('@renderer/panels/GraphPanel/GraphPanel')).GraphPanel
}))
const QuotePanel = lazy(async () => ({
  default: (await import('@renderer/panels/QuotePanel/QuotePanel')).QuotePanel
}))
const TickerPanel = lazy(async () => ({
  default: (await import('@renderer/panels/TickerPanel/TickerPanel')).TickerPanel
}))
const AlertsPanel = lazy(async () => ({
  default: (await import('@renderer/panels/AlertsPanel/AlertsPanel')).AlertsPanel
}))
const BigNumberPanel = lazy(async () => ({
  default: (await import('@renderer/panels/BigNumberPanel/BigNumberPanel')).BigNumberPanel
}))
const HeatmapPanel = lazy(async () => ({
  default: (await import('@renderer/panels/HeatmapPanel/HeatmapPanel')).HeatmapPanel
}))
const ConsolePanel = lazy(async () => ({
  default: (await import('@renderer/panels/ConsolePanel/ConsolePanel')).ConsolePanel
}))

export const PANEL_DEFINITIONS: readonly PanelDefinition<unknown>[] = [
  definePanel<MatrixConfig>({
    type: 'matrix',
    displayName: 'MATRIX',
    component: MatrixPanel,
    defaultConfig: { sectors: [], showBreadth: true },
    describe: (config) => (config.sectors.length === 0 ? 'ALL' : config.sectors.join('/'))
  }),
  definePanel<ChartConfig>({
    type: 'chart',
    displayName: 'CHART',
    component: ChartPanel,
    defaultConfig: { symbolId: firstSymbol!.id, intervalSeconds: 2, style: 'candles' },
    describe: (config) => `${config.symbolId.toUpperCase()} ${config.intervalSeconds}S`
  }),
  definePanel<GraphConfig>({
    type: 'graph',
    displayName: 'GRAPH',
    component: GraphPanel,
    defaultConfig: { nodeCount: 120, reassignSeconds: 2, glow: true, rings: false },
    describe: (config) => `${config.nodeCount}N`
  }),
  definePanel<BigNumberConfig>({
    type: 'bignumber',
    displayName: 'BOOK',
    component: BigNumberPanel,
    defaultConfig: { label: 'TOTAL BOOK VALUE', currency: 'USD' },
    describe: (config) => config.currency
  }),
  definePanel<HeatmapConfig>({
    type: 'heatmap',
    displayName: 'HEATMAP',
    component: HeatmapPanel,
    defaultConfig: { scale: 4 },
    describe: (config) => `±${config.scale}%`
  }),
  definePanel<AlertsConfig>({
    type: 'alerts',
    displayName: 'ALERTS',
    component: AlertsPanel,
    defaultConfig: { limit: 60, minSeverity: 'info' },
    describe: (config) => config.minSeverity.toUpperCase()
  }),
  definePanel<ConsoleConfig>({
    type: 'console',
    displayName: 'CONSOLE',
    component: ConsolePanel,
    defaultConfig: { typeSpeed: 26, historyLimit: 60 }
  }),
  definePanel<TickerConfig>({
    type: 'ticker',
    displayName: 'TAPE',
    component: TickerPanel,
    defaultConfig: { scrollSeconds: 40 },
    describe: (config) => `${config.scrollSeconds}S`
  }),
  definePanel<QuoteConfig>({
    type: 'quote',
    displayName: 'QUOTE',
    component: QuotePanel,
    defaultConfig: { symbolId: firstSymbol!.id },
    describe: (config) => config.symbolId.toUpperCase()
  })
]

const BY_TYPE = new Map(PANEL_DEFINITIONS.map((definition) => [definition.type, definition]))

export function getPanelDefinition(type: string): PanelDefinition<unknown> | undefined {
  return BY_TYPE.get(type)
}

/** `QUOTE · TESR` — the text shown in the tab. */
export function panelTitle(type: string, config: unknown): string {
  const definition = getPanelDefinition(type)
  if (!definition) return type.toUpperCase()
  const detail = definition.describe?.(config)
  return detail ? `${definition.displayName} · ${detail}` : definition.displayName
}
