import { useEffect } from 'react'
import { checkForUpdate, isDarwin } from '@/shared/api'
import { useUpdaterStore } from '@/shared/model'

// Module-scope session flag — survives Strict Mode double-mount and re-mounts of AppProviders.
// Reset only on full process restart (D-02). Not in Zustand (explicit out-of-React dedup) and not in useRef (per-instance).
let hasChecked = false

/**
 * Silent startup update check (AUTO-01).
 *
 * Guard order (D-04): PROD → dedup → darwin → check → setAvailable.
 * Calling `setAvailable(update)` triggers the already-mounted UpdateDialog to open
 * automatically (Phase 74 D-09 state-driven dialog). No toast is surfaced here.
 * Errors from `checkForUpdate()` are silenced via `console.error` (D-07).
 */
export function useStartupUpdateCheck(): void {
  useEffect(() => {
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
        // D-07: silent fail — user may retry via Settings "Проверить обновления".
        console.error('[useStartupUpdateCheck] update check failed:', err)
      }
    })()
  }, [])
}
