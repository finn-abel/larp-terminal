import { REGIMES } from '@renderer/engine'
import { useSnapshot } from '@renderer/store/useMarketStore'
import { DESK_CLOCKS, useClocks } from '@renderer/hooks/useClocks'
import { latencyFor, signalBars } from '@renderer/lib/latency'
import './status-bar.css'

/** Fixed strip along the bottom. Not a dockview panel — it is always present. */
export function StatusBar(): React.JSX.Element {
  const snapshot = useSnapshot()
  const clocks = useClocks()
  const regime = snapshot.regime.name
  const latency = latencyFor(snapshot.tick, regime)
  const bars = signalBars(latency)

  return (
    <footer className="statusbar" aria-label="Session status">
      <span className="statusbar__group">
        <span className="statusbar__dot statusbar__dot--live" aria-hidden="true" />
        SECURE
      </span>

      <span className="statusbar__group">
        <span className="statusbar__label">LAT</span>
        <span className="statusbar__value">{latency.toFixed(1)}ms</span>
        <span className="statusbar__bars" aria-label={`Signal ${bars} of 4`}>
          {[1, 2, 3, 4].map((bar) => (
            <i key={bar} className={bar <= bars ? 'is-on' : undefined} />
          ))}
        </span>
      </span>

      <span className="statusbar__group">
        <span className="statusbar__label">SEED</span>
        <span className="statusbar__value">{snapshot.seed}</span>
      </span>

      <span className="statusbar__group">
        <span className="statusbar__label">TICK</span>
        <span className="statusbar__value">{snapshot.tick.toString().padStart(7, '0')}</span>
      </span>

      <span className="statusbar__clocks">
        {DESK_CLOCKS.map((clock) => (
          <span className="statusbar__clock" key={clock.code}>
            <span className="statusbar__label">{clock.code}</span>
            <span className="statusbar__value">{clocks.get(clock.code) ?? '--:--:--'}</span>
          </span>
        ))}
      </span>

      <span className={`statusbar__regime statusbar__regime--${regime}`}>
        {REGIMES[regime].code}
      </span>
    </footer>
  )
}
