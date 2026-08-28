import { streamChange } from '@renderer/engine'
import { useStream } from '@renderer/store/useMarketStore'
import { sessionDirection, signed, TICK_GLYPH, tickDirection } from '@renderer/lib/format'
import './quote-panel.css'

export interface QuoteConfig {
  readonly symbolId: string
}

export function QuotePanel({ config }: { config: QuoteConfig }): React.JSX.Element {
  const stream = useStream(config.symbolId)

  if (!stream) {
    return <p className="quote__missing">NO FEED · {config.symbolId.toUpperCase()}</p>
  }

  const { absolute, percent } = streamChange(stream)
  const direction = sessionDirection(stream)
  const tick = tickDirection(stream)

  return (
    <article className="quote">
      <header className="quote__head">
        <span className="quote__symbol">{stream.definition.symbol}</span>
        <span className="quote__sector">{stream.definition.sector}</span>
      </header>
      <p className="quote__name">{stream.definition.name}</p>

      <p className={`quote__price mkt-${direction}`}>
        <span className={`quote__tick mkt-${tick}`}>{TICK_GLYPH[tick]}</span>
        {stream.price.toFixed(2)}
      </p>

      <p className={`quote__change mkt-${direction}`}>
        {signed(absolute)} <span className="quote__pct">{signed(percent)}%</span>
      </p>

      <dl className="quote__stats">
        <div>
          <dt>OPEN</dt>
          <dd>{stream.open.toFixed(2)}</dd>
        </div>
        <div>
          <dt>HIGH</dt>
          <dd>{stream.high.toFixed(2)}</dd>
        </div>
        <div>
          <dt>LOW</dt>
          <dd>{stream.low.toFixed(2)}</dd>
        </div>
        <div>
          <dt>BETA</dt>
          <dd>{stream.definition.beta.toFixed(2)}</dd>
        </div>
      </dl>
    </article>
  )
}
