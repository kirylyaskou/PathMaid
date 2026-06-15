// Password gate for the Debug page. This is a local diagnostics tool, not a
// security boundary — the value is intentionally hardcoded (not a secret). It
// only keeps curious users out of the raw error log surface.
export const DEBUG_PASSWORD = '3585856'

const STORAGE_KEY = 'pathmaid.debug.unlocked'

/** Whether the Debug page is unlocked in this browser profile. Persists across reloads. */
export function isDebugUnlocked(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    // localStorage can throw in restricted contexts — default to locked.
    return false
  }
}

/** Mark the Debug page as unlocked for subsequent visits. */
export function unlockDebug(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // Same as above — no-op. The in-memory state still flips for this session.
  }
}

/** Re-lock the Debug page. */
export function lockDebug(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // no-op
  }
}

/** Returns true iff the supplied password matches. */
export function verifyDebugPassword(input: string): boolean {
  return input === DEBUG_PASSWORD
}
