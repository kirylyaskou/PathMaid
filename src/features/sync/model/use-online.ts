import { useEffect, useState } from 'react'

/**
 * React hook mirroring navigator.onLine, with event listeners for
 * `online` / `offline` and `visibilitychange` (a tab returning to focus often
 * coincides with restored connectivity after sleep).
 *
 * Tauri WebView fires these standard browser events, so no plugin is needed.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    // visibilitychange: when the window regains focus, re-check onLine because
    // the OS may have reconnected during sleep without firing `online`.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        setOnline(navigator.onLine)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return online
}
