import { useEffect, useState } from 'react'

/** Tracks the host window's maximize state, kept in sync by the main process. */
export function useMaximized(): boolean {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    let isMounted = true

    void window.larp.window.isMaximized().then((value) => {
      if (isMounted) setIsMaximized(value)
    })

    const unsubscribe = window.larp.window.onMaximizedChanged(setIsMaximized)

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  return isMaximized
}
