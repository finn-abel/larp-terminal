import { useEffect, useRef, useState } from 'react'
import { useRegimeName } from '@renderer/store/useMarketStore'
import type { RegimeName } from '@renderer/engine'

/** How long the app-wide flash lasts after a regime transition. */
const FLASH_MS = 1600

/**
 * Design principle 4: drama on a timer. When the engine changes regime the whole shell
 * flashes in that regime's colour, so a crash ripples across every panel at once rather
 * than only showing up wherever someone happens to be looking.
 */
export function useRegimeFlash(): RegimeName | null {
  const regime = useRegimeName()
  const previous = useRef(regime)
  const [flash, setFlash] = useState<RegimeName | null>(null)

  useEffect(() => {
    if (regime === previous.current) return
    previous.current = regime
    setFlash(regime)

    const timer = setTimeout(() => setFlash(null), FLASH_MS)
    return () => clearTimeout(timer)
  }, [regime])

  return flash
}
