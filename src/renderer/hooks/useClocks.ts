import { useEffect, useState } from 'react'

export interface DeskClock {
  readonly code: string
  readonly timeZone: string
}

export const DESK_CLOCKS: readonly DeskClock[] = [
  { code: 'NY', timeZone: 'America/New_York' },
  { code: 'LON', timeZone: 'Europe/London' },
  { code: 'TOK', timeZone: 'Asia/Tokyo' },
  { code: 'HKG', timeZone: 'Asia/Hong_Kong' }
]

const FORMATTERS = new Map(
  DESK_CLOCKS.map((clock) => [
    clock.code,
    new Intl.DateTimeFormat('en-GB', {
      timeZone: clock.timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  ])
)

/** Real wall-clock time per desk. The only thing in this app that is not fake. */
export function useClocks(): ReadonlyMap<string, string> {
  const [times, setTimes] = useState(() => readClocks())

  useEffect(() => {
    const interval = setInterval(() => setTimes(readClocks()), 1000)
    return () => clearInterval(interval)
  }, [])

  return times
}

function readClocks(): ReadonlyMap<string, string> {
  const now = new Date()
  return new Map(
    DESK_CLOCKS.map((clock) => [clock.code, FORMATTERS.get(clock.code)!.format(now)])
  )
}
