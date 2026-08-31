import { streamChange } from '@renderer/engine'
import { useStreams } from '@renderer/store/useMarketStore'
import { sessionDirection, signed, TICK_GLYPH, tickDirection } from '@renderer/lib/format'
import type { PanelProps } from '@renderer/layout/panelRegistry'
import './ticker-panel.css'

export interface TickerConfig {
  /** Seconds for one full pass of the tape. */
  readonly scrollSeconds: number
}

export function TickerPanel({ config }: PanelProps<TickerConfig>): React.JSX.Element {
  const streams = useStreams()

  // The tape is rendered twice back to back; the marquee translates by exactly half,
  // so the loop is seamless without measuring anything.
  const run = [...streams, ...streams]

  return (
    <div className="ticker">
      <div
        className="ticker__track"
        style={{ animationDuration: `${Math.max(4, config.scrollSeconds)}s` }}
      >
        {run.map((stream, index) => {
          const { percent } = streamChange(stream)
          const direction = sessionDirection(stream)
          const tick = tickDirection(stream)

          return (
            <span className="ticker__item" key={`${stream.definition.id}-${index}`}>
              <span className="ticker__symbol">{stream.definition.symbol}</span>
              <span className={`ticker__price mkt-${direction}`}>{stream.price.toFixed(2)}</span>
              <span className={`ticker__change mkt-${direction}`}>
                <span className={`mkt-${tick}`}>{TICK_GLYPH[tick]}</span>
                {signed(percent)}%
              </span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
