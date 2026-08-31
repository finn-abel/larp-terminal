import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'larp.crt'

/** Viewer preference for the scanline overlay. Local to this machine, so localStorage. */
export function useCrtOverlay(): { enabled: boolean; toggle: () => void } {
  const [enabled, setEnabled] = useState(() => read())

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0')
    } catch {
      // A preference we cannot persist is not worth surfacing.
    }
  }, [enabled])

  return { enabled, toggle: useCallback(() => setEnabled((value) => !value), []) }
}

function read(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}
