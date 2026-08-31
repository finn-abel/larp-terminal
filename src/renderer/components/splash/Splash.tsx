import { useEffect, useState } from 'react'
import './splash.css'

interface SplashProps {
  readonly onDone: () => void
}

const STEPS: readonly { text: string; ms: number }[] = [
  { text: 'ESTABLISHING SECURE CONNECTION', ms: 520 },
  { text: 'NEGOTIATING CIPHER SUITE · TLS_AES_256_GCM', ms: 420 },
  { text: 'AUTHENTICATING TERMINAL LT-0135', ms: 460 },
  { text: 'SUBSCRIBING MARKET FEEDS · 12 SYMBOLS', ms: 400 },
  { text: 'SYNCHRONISING CLUSTER MESH', ms: 380 },
  { text: 'ACCESS GRANTED', ms: 620 }
]

const TOTAL_MS = STEPS.reduce((sum, step) => sum + step.ms, 0)

/** Fake auth sequence. It gates nothing — the joke is that it looks like it does. */
export function Splash({ onDone }: SplashProps): React.JSX.Element {
  const [step, setStep] = useState(0)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    let elapsed = 0
    const timers = STEPS.map((entry, index) => {
      elapsed += entry.ms
      return setTimeout(() => setStep(index + 1), elapsed)
    })

    const exit = setTimeout(() => setLeaving(true), TOTAL_MS)
    const done = setTimeout(onDone, TOTAL_MS + 420)

    return () => {
      for (const timer of timers) clearTimeout(timer)
      clearTimeout(exit)
      clearTimeout(done)
    }
  }, [onDone])

  const progress = Math.min(100, (step / STEPS.length) * 100)
  const granted = step >= STEPS.length

  return (
    <div className={`splash${leaving ? ' splash--leaving' : ''}`} role="status" aria-live="polite">
      <div className="splash__panel">
        <p className="splash__brand">
          LARP<span className="splash__sep">//</span>TERMINAL
        </p>

        <ul className="splash__steps">
          {STEPS.slice(0, Math.max(1, step)).map((entry, index) => (
            <li key={entry.text} className="splash__step">
              <span className="splash__marker">{index < step ? 'OK' : '··'}</span>
              {entry.text}
            </li>
          ))}
        </ul>

        <div className="splash__bar" aria-hidden="true">
          <span className="splash__bar-fill" style={{ width: `${progress}%` }} />
        </div>

        <p className={`splash__status${granted ? ' splash__status--granted' : ''}`}>
          {granted ? 'ACCESS GRANTED' : `${Math.round(progress)}%`}
        </p>

        <p className="splash__disclaimer">
          SIMULATED SESSION · ALL DATA PROCEDURALLY GENERATED
        </p>
      </div>
    </div>
  )
}
