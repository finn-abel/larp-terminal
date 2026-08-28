import { REGIMES, streamChange } from '@renderer/engine'
import { useSnapshot } from '@renderer/store/useMarketStore'
import { sessionDirection, signed, TICK_GLYPH, tickDirection } from '@renderer/lib/format'
import './matrix-panel.css'

export interface MatrixConfig {
  /** Empty means every sector. */
  readonly sectors: readonly string[]
  readonly showBreadth: boolean
}

export function MatrixPanel({ config }: { config: MatrixConfig }): React.JSX.Element {
  const snapshot = useSnapshot()
  const streams =
    config.sectors.length === 0
      ? snapshot.streams
      : snapshot.streams.filter((stream) => config.sectors.includes(stream.definition.sector))

  const advancers = streams.filter((stream) => stream.price >= stream.open).length

  return (
    <div className="matrix">
      <header className="matrix__head">
        <span className={`matrix__regime matrix__regime--${snapshot.regime.name}`}>
          {REGIMES[snapshot.regime.name].code}
        </span>
        {config.showBreadth ? (
          <span className="matrix__breadth">
            <span className="mkt-up">
              {advancers}
              {TICK_GLYPH.up}
            </span>
            <span className="mkt-down">
              {streams.length - advancers}
              {TICK_GLYPH.down}
            </span>
          </span>
        ) : null}
      </header>

      <table className="matrix__table">
        <thead>
          <tr>
            <th scope="col" className="matrix__tick-head" />
            <th scope="col">SYM</th>
            <th scope="col" className="matrix__num">LAST</th>
            <th scope="col" className="matrix__num">CHG</th>
            <th scope="col" className="matrix__num">CHG%</th>
          </tr>
        </thead>
        <tbody>
          {streams.map((stream) => {
            const { absolute, percent } = streamChange(stream)
            const direction = sessionDirection(stream)
            const tick = tickDirection(stream)
            return (
              <tr key={stream.definition.id} className={`matrix__row mkt-edge--${direction}`}>
                <td className={`matrix__tick mkt-${tick}`}>{TICK_GLYPH[tick]}</td>
                <td className="matrix__sym">{stream.definition.symbol}</td>
                <td className={`matrix__num mkt-${direction}`}>{stream.price.toFixed(2)}</td>
                <td className={`matrix__num mkt-cell mkt-cell--${direction}`}>
                  {signed(absolute)}
                </td>
                <td className={`matrix__num mkt-cell mkt-cell--${direction}`}>
                  {signed(percent)}%
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
