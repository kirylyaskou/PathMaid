import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { recordError } from '@/shared/api/logging'

import { runSync, type SyncRunResult } from './sync-engine'

/**
 * Sync UI state. Thin reactive wrapper around the stateless sync-engine.
 *
 * status transitions:
 *   idle → syncing → (synced | error)
 * The store does NOT drive the engine; the engine is called imperatively
 * (from useSyncTimer or a button), and the store is updated to reflect the
 * outcome so indicators can render.
 */

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

export interface SyncState {
  status: SyncStatus
  /** ISO timestamp of the last successful sync, for "synced N min ago" label. */
  lastSyncAt: string | null
  /** Human-readable last error message; null when none. */
  lastError: string | null
  /** Last run stats (null until first sync). */
  lastResult: SyncRunResult | null
  /** Auto-sync enabled toggle (persisted separately — see advanced-settings). */

  /** Run a full pull+push pass. Returns the result; updates status. */
  syncNow: () => Promise<SyncRunResult>
}

export const useSyncStore = create<SyncState>()(
  immer((set) => ({
    status: 'idle',
    lastSyncAt: null,
    lastError: null,
    lastResult: null,

    syncNow: async () => {
      set((s) => { s.status = 'syncing'; s.lastError = null })
      try {
        const result = await runSync()
        set((s) => {
          s.lastResult = result
          if (result.errors.length > 0) {
            s.status = 'error'
            s.lastError = result.errors[0]!
          } else {
            s.status = 'synced'
            s.lastSyncAt = new Date().toISOString()
          }
        })
        return result
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        await recordError('sync.full', `fatal sync error: ${msg}`, err)
        set((s) => {
          s.status = 'error'
          s.lastError = msg
        })
        throw err
      }
    },
  })),
)
