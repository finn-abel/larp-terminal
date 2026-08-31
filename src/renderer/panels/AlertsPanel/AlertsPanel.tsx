import { useEvents } from '@renderer/store/useMarketStore'
import { formatClock } from '@renderer/lib/format'
import type { EventSeverity } from '@renderer/engine'
import type { PanelProps } from '@renderer/layout/panelRegistry'
import './alerts-panel.css'

export interface AlertsConfig {
  readonly limit: number
  readonly minSeverity: EventSeverity
}

const RANK: Record<EventSeverity, number> = { info: 0, warn: 1, critical: 2 }

export function AlertsPanel({ config }: PanelProps<AlertsConfig>): React.JSX.Element {
  const events = useEvents()
  const threshold = RANK[config.minSeverity] ?? 0
  const visible = events.filter((event) => RANK[event.severity] >= threshold).slice(0, config.limit)

  return (
    <ul className="alerts" aria-label="Alerts feed" aria-live="off">
      {visible.length === 0 ? <li className="alerts__idle">AWAITING EVENTS…</li> : null}
      {visible.map((event) => (
        <li key={event.id} className={`alerts__row alerts__row--${event.severity}`}>
          <span className="alerts__time">{formatClock(event.at)}</span>
          <span className="alerts__message">{event.message}</span>
        </li>
      ))}
    </ul>
  )
}
