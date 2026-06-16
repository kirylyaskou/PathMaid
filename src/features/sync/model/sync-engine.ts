import { SYNC_TABLES } from '@/shared/api/cloud/sync-tables'
import { pushTable } from '@/shared/api/cloud/sync-push'
import { pullTable } from '@/shared/api/cloud/sync-pull'
import { pushDeletions } from '@/shared/api/cloud/sync-deletions'

/**
 * Sync orchestrator.
 *
 * One pass = pull-all-then-push-all. Pull first so that when we push, any
 * server-side updates we missed are already merged locally and we don't
 * blindly overwrite them with a stale local row. (LWW on the server trigger
 * would protect us anyway, but pulling first reduces needless conflicts.)
 *
 * The engine is deliberately stateless — sync status (running/error/lastAt)
 * lives in the Zustand store (useSyncStore) which wraps these functions.
 * Keeping the engine pure lets it be called from a button, a timer, or a
 * background queue without coupling to React.
 */

export interface SyncRunResult {
  pulled: number
  applied: number
  skipped: number
  pushed: number
  deleted: number
  errors: string[]
}

/**
 * Run a full sync pass across all tables in registry order.
 * Pull → push. Throws only on a fatal config error (no cloud); per-table
 * errors are collected into `errors` and do not abort the pass.
 */
export async function runSync(): Promise<SyncRunResult> {
  const result: SyncRunResult = {
    pulled: 0,
    applied: 0,
    skipped: 0,
    pushed: 0,
    deleted: 0,
    errors: [],
  }

  // --- PULL ---
  for (const def of SYNC_TABLES) {
    try {
      const stats = await pullTable(def)
      result.pulled += stats.pulled
      result.applied += stats.applied
      result.skipped += stats.skipped
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      result.errors.push(`pull ${def.local}: ${msg}`)
      console.error(`[sync.engine] pull ${def.local} failed`, err)
    }
  }

  // --- PUSH (rows) ---
  for (const def of SYNC_TABLES) {
    try {
      const stats = await pushTable(def)
      result.pushed += stats.pushed
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      result.errors.push(`push ${def.local}: ${msg}`)
      console.error(`[sync.engine] push ${def.local} failed`, err)
    }
  }

  // --- PUSH (deletions) ---
  // Tombstones are pushed AFTER rows so that a re-insert-then-delete sequence
  // on the same id does not leave the server with a phantom: the latest upsert
  // wins, then the delete removes it if the delete was the final local state.
  try {
    const delStats = await pushDeletions()
    result.deleted = delStats.reduce((sum, s) => sum + s.deleted, 0)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    result.errors.push(`push deletions: ${msg}`)
    console.error('[sync.engine] push deletions failed', err)
  }

  return result
}

/**
 * Push only — used for an explicit "flush local changes" action without
 * pulling remote updates first (e.g. right after a bulk local edit).
 */
export async function runPushOnly(): Promise<SyncRunResult> {
  const result: SyncRunResult = {
    pulled: 0,
    applied: 0,
    skipped: 0,
    pushed: 0,
    deleted: 0,
    errors: [],
  }
  for (const def of SYNC_TABLES) {
    try {
      const stats = await pushTable(def)
      result.pushed += stats.pushed
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      result.errors.push(`push ${def.local}: ${msg}`)
      console.error(`[sync.engine] push ${def.local} failed`, err)
    }
  }
  try {
    const delStats = await pushDeletions()
    result.deleted = delStats.reduce((sum, s) => sum + s.deleted, 0)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    result.errors.push(`push deletions: ${msg}`)
    console.error('[sync.engine] push deletions failed', err)
  }
  return result
}

/**
 * Pull only — used for first-login "load from server" flow.
 */
export async function runPullOnly(): Promise<SyncRunResult> {
  const result: SyncRunResult = {
    pulled: 0,
    applied: 0,
    skipped: 0,
    pushed: 0,
    deleted: 0,
    errors: [],
  }
  for (const def of SYNC_TABLES) {
    try {
      const stats = await pullTable(def)
      result.pulled += stats.pulled
      result.applied += stats.applied
      result.skipped += stats.skipped
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      result.errors.push(`pull ${def.local}: ${msg}`)
      console.error(`[sync.engine] pull ${def.local} failed`, err)
    }
  }
  return result
}
