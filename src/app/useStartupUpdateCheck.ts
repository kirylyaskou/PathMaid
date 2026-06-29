import { useEffect } from 'react'
import { checkForUpdate, isDarwin, recordWarn, errMessage } from '@/shared/api'
import { useUpdaterStore } from '@/shared/model'

// Module-scope session flag — survives Strict Mode double-mount and re-mounts of AppProviders.
// Reset only on full process restart . Not in Zustand (explicit out-of-React dedup) and not in useRef (per-instance).
let hasChecked = false

/**
 * Silent startup update check (AUTO-01).
 *
 * Guard order : PROD → dedup → darwin → check → setAvailable.
 * Calling `setAvailable(update)` triggers the already-mounted UpdateDialog to open
 * automatically. No toast is surfaced here.
 * Errors from `checkForUpdate()` are silenced via `console.error` .
 */
export function useStartupUpdateCheck(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    // React disallows `async` as the useEffect callback — wrap in async IIFE.
    ;(async () => {
      if (!import.meta.env.PROD) return
      if (hasChecked) return
      hasChecked = true
      if (isDarwin()) return

      try {
        const update = await checkForUpdate()
        if (!update) return
        useUpdaterStore.getState().setAvailable(update)
      } catch (err) {
        // silent fail — user may retry via Settings "Проверить обновления".
        // err is swallowed deliberately: this runs on every cold boot and must
        // not interrupt startup. Recorded as warn so it surfaces in the Debug
        // page without escalating to an error-level alert.
        void recordWarn('update-check', `Startup update check failed: ${errMessage(err)}`)
      }
    })()
  }, [enabled])
}
