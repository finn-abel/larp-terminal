/**
 * Placeholder status cluster. Step 6 replaces these with live engine values —
 * for now the codes are static so the chrome reads correctly at a glance.
 */

interface StatusChip {
  readonly label: string
  readonly value: string
  readonly tone?: 'accent' | 'up' | 'dim'
}

const CHIPS: readonly StatusChip[] = [
  { label: 'SES', value: 'LT-0000-XXXX', tone: 'dim' },
  { label: 'LINK', value: 'SECURE', tone: 'up' },
  { label: 'LAT', value: '—— ms', tone: 'dim' },
  { label: 'REGIME', value: 'STANDBY', tone: 'accent' }
]

export function StatusCluster(): React.JSX.Element {
  return (
    <div className="status-cluster" role="status" aria-label="Session status">
      <span className="status-live">
        <span className="status-live__dot" aria-hidden="true" />
        LIVE
      </span>
      {CHIPS.map((chip) => (
        <span key={chip.label} className="status-chip">
          <span className="status-chip__label">{chip.label}</span>
          <span className={`status-chip__value status-chip__value--${chip.tone ?? 'default'}`}>
            {chip.value}
          </span>
        </span>
      ))}
    </div>
  )
}
