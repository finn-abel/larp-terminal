import { REGIMES, streamChange, type StreamState } from '@renderer/engine'
import { useEvents, useSnapshot } from '@renderer/store/useMarketStore'
import './engine-readout.css'

/**
 * Temporary Step 2 readout: plain text proving the engine → store → React path.
 * Step 3 replaces this with the dockable panel host.
 */
export function EngineReadout(): React.JSX.Element {
  const snapshot = useSnapshot()
  const events = useEvents()
  const regime = REGIMES[snapshot.regime.name]
  const advancers = snapshot.streams.filter((stream) => stream.price >= stream.open).length

  return (
    <section className="readout" aria-label="Engine debug readout">
      <header className="readout__head">
        <span className="readout__title">ENGINE / DEBUG</span>
        <span className="readout__meta">SEED {snapshot.seed}</span>
        <span className="readout__meta">TICK {snapshot.tick.toString().padStart(6, '0')}</span>
        <span className="readout__meta">T+{formatClock(snapshot.time)}</span>
        <span className={`readout__regime readout__regime--${snapshot.regime.name}`}>
          {regime.code}
        </span>
        <span className="readout__meta">
          {snapshot.regime.elapsedSeconds.toFixed(0)}/{snapshot.regime.durationSeconds.toFixed(0)}s
        </span>
        <span className="readout__meta">SHIFTS {snapshot.regime.transitions}</span>
        <span className="readout__breadth">
          <span className="readout__breadth-up">
            {advancers}
            {TICK_GLYPH.up}
          </span>
          <span className="readout__breadth-down">
            {snapshot.streams.length - advancers}
            {TICK_GLYPH.down}
          </span>
        </span>
      </header>

      <table className="readout__table">
        <thead>
          <tr>
            <th scope="col" className="readout__tick-head" aria-label="Tick direction" />
            <th scope="col">SYM</th>
            <th scope="col">SECTOR</th>
            <th scope="col" className="readout__num">LAST</th>
            <th scope="col" className="readout__num">CHG</th>
            <th scope="col" className="readout__num">CHG%</th>
            <th scope="col" className="readout__num">HIGH</th>
            <th scope="col" className="readout__num">LOW</th>
          </tr>
        </thead>
        <tbody>
          {snapshot.streams.map((stream) => {
            const { absolute, percent } = streamChange(stream)
            // Session direction drives the row; the last tick drives the arrow only.
            const tone = absolute >= 0 ? 'up' : 'down'
            const tick = tickDirection(stream)
            return (
              <tr key={stream.definition.id} className={`readout__row readout__row--${tone}`}>
                <td className={`readout__tick readout__tick--${tick}`}>{TICK_GLYPH[tick]}</td>
                <td className="readout__sym">{stream.definition.symbol}</td>
                <td className="readout__dim">{stream.definition.sector}</td>
                <td className={`readout__num readout__last readout__${tone}`}>
                  {stream.price.toFixed(2)}
                </td>
                <td className={`readout__num readout__cell readout__cell--${tone}`}>
                  {signed(absolute)}
                </td>
                <td className={`readout__num readout__cell readout__cell--${tone}`}>
                  {signed(percent)}%
                </td>
                <td className="readout__num readout__dim">{stream.high.toFixed(2)}</td>
                <td className="readout__num readout__dim">{stream.low.toFixed(2)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <ul className="readout__events">
        {events.slice(0, 6).map((event) => (
          <li key={event.id} className={`readout__event readout__event--${event.severity}`}>
            <span className="readout__dim">{formatClock(event.at)}</span> {event.message}
          </li>
        ))}
        <li className="readout__cursor" aria-hidden="true">
          ▊
        </li>
      </ul>
    </section>
  )
}

const TICK_GLYPH = { up: '\u25B2', down: '\u25BC', flat: '\u00B7' } as const

type TickDirection = keyof typeof TICK_GLYPH

function tickDirection(stream: StreamState): TickDirection {
  if (stream.price > stream.previousPrice) return 'up'
  if (stream.price < stream.previousPrice) return 'down'
  return 'flat'
}

function signed(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`
}

function formatClock(milliseconds: number): string {
  const total = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(total / 60)
    .toString()
    .padStart(2, '0')
  const seconds = (total % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}
