import { REGIMES } from '@renderer/engine'
import { useRegimeName, useStreams } from '@renderer/store/useMarketStore'
import { holdingsFor, portfolioHistory, portfolioValue } from '@renderer/lib/portfolio'
import { signed } from '@renderer/lib/format'
import type { PanelProps } from '@renderer/layout/panelRegistry'
import './big-number-panel.css'

export interface BigNumberConfig {
  readonly label: string
  readonly currency: string
}

export function BigNumberPanel({ config }: PanelProps<BigNumberConfig>): React.JSX.Element {
  const streams = useStreams()
  const regime = useRegimeName()
  const value = portfolioValue(streams)
  const direction = value.absolute >= 0 ? 'up' : 'down'
  const history = portfolioHistory(streams, 140)
  const exposure = streams.reduce(
    (sum, stream) => sum + stream.price * holdingsFor(stream.definition.id),
    0
  )

  return (
    <section className="bignumber">
      <header className="bignumber__label">{config.label}</header>

      <p className={`bignumber__value mkt-${direction}`}>
        <span className="bignumber__currency">{config.currency}</span>
        {formatMoney(value.total)}
      </p>

      <p className={`bignumber__delta mkt-${direction}`}>
        {signed(value.absolute, 0)} <span>{signed(value.percent)}%</span>
      </p>

      <Sparkline points={history} tone={direction} />

      <dl className="bignumber__stats">
        <div>
          <dt>POSITIONS</dt>
          <dd>{streams.length}</dd>
        </div>
        <div>
          <dt>GROSS EXPOSURE</dt>
          <dd>{formatMoney(exposure)}</dd>
        </div>
        <div>
          <dt>SESSION HIGH</dt>
          <dd>{formatMoney(Math.max(value.total, ...history))}</dd>
        </div>
        <div>
          <dt>SESSION LOW</dt>
          <dd>{formatMoney(Math.min(value.total, ...history))}</dd>
        </div>
      </dl>

      <footer className="bignumber__foot">
        <span className="bignumber__meta">SESSION OPEN {formatMoney(value.open)}</span>
        <span className={`bignumber__regime bignumber__regime--${regime}`}>
          {REGIMES[regime].code}
        </span>
      </footer>
    </section>
  )
}

/** Session shape of the book. Pure SVG — no chart library for a 140-point line. */
function Sparkline({
  points,
  tone
}: {
  points: readonly number[]
  tone: 'up' | 'down'
}): React.JSX.Element | null {
  if (points.length < 2) return null

  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const path = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 100
      const y = 100 - ((point - min) / span) * 100
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  return (
    <svg
      className={`bignumber__spark mkt-${tone}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={`${path} L100,100 L0,100 Z`} className="bignumber__spark-fill" />
      <path d={path} className="bignumber__spark-line" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function formatMoney(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 })
}
