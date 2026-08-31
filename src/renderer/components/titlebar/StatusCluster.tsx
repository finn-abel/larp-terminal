import { REGIMES } from '@renderer/engine'
import { useSnapshot } from '@renderer/store/useMarketStore'
import { latencyFor } from '@renderer/lib/latency'
import { formatClock } from '@renderer/lib/format'

/** Live session status. Placeholder text until Step 6 wired it to the engine. */
export function StatusCluster(): React.JSX.Element {
  const snapshot = useSnapshot()
  const regime = snapshot.regime.name

  const chips = [
    { label: 'SES', value: sessionCode(snapshot.seed), tone: 'dim' },
    { label: 'UPTIME', value: formatClock(snapshot.time), tone: 'dim' },
    { label: 'LAT', value: `${latencyFor(snapshot.tick, regime).toFixed(1)} ms`, tone: 'dim' },
    { label: 'REGIME', value: REGIMES[regime].code, tone: regimeTone(regime) }
  ] as const

  return (
    <div className="status-cluster" role="status" aria-label="Session status">
      <span className="status-live">
        <span className="status-live__dot" aria-hidden="true" />
        LIVE
      </span>
      {chips.map((chip) => (
        <span key={chip.label} className="status-chip">
          <span className="status-chip__label">{chip.label}</span>
          <span className={`status-chip__value status-chip__value--${chip.tone}`}>
            {chip.value}
          </span>
        </span>
      ))}
    </div>
  )
}

function regimeTone(regime: keyof typeof REGIMES): 'accent' | 'up' | 'down' | 'dim' {
  if (regime === 'rally') return 'up'
  if (regime === 'crash') return 'down'
  if (regime === 'high_vol') return 'accent'
  return 'dim'
}

/** A stable, official-looking session id derived from the seed. */
function sessionCode(seed: number): string {
  const hex = (seed >>> 0).toString(16).toUpperCase().padStart(8, '0')
  return `LT-${hex.slice(0, 4)}-${hex.slice(4)}`
}
