import { useStreams } from '@renderer/store/useMarketStore'
import { heatIntensity, sectorSummaries } from '@renderer/lib/sectors'
import { signed } from '@renderer/lib/format'
import type { PanelProps } from '@renderer/layout/panelRegistry'
import './heatmap-panel.css'

export interface HeatmapConfig {
  /** Percentage move that saturates a cell. */
  readonly scale: number
}

export function HeatmapPanel({ config }: PanelProps<HeatmapConfig>): React.JSX.Element {
  const summaries = sectorSummaries(useStreams())

  return (
    <div className="heatmap" role="table" aria-label="Sector heatmap">
      {summaries.map((summary) => {
        const intensity = heatIntensity(summary.percent, config.scale)
        const tone = summary.percent >= 0 ? 'up' : 'down'

        return (
          <div
            key={summary.sector}
            role="row"
            className={`heatmap__cell heatmap__cell--${tone}`}
            style={{ '--heat': intensity.toFixed(3) } as React.CSSProperties}
          >
            <span className="heatmap__sector">{summary.sector}</span>
            <span className="heatmap__value">{signed(summary.percent)}%</span>
            <span className="heatmap__breadth">
              {Math.round(summary.breadth * summary.count)}/{summary.count}
            </span>
          </div>
        )
      })}
    </div>
  )
}
