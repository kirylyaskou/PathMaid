import { getDb } from '@/shared/db'

import { getSupabase } from './supabase-client'
import type { SyncTableDef } from './sync-tables'

/**
 * Push locally-dirty rows to the remote mirror.
 *
 * For each synced table:
 *   1. SELECT all columns (data + sync-control) WHERE sync_dirty = 1, plus
 *      the optional localFilter (e.g. characters.source_adventure IS NULL).
 *   2. Strip sync-control columns (sync_dirty), keep updated_at + deleted_at
 *      so the server's LWW trigger can compare timestamps.
 *   3. Upsert in batches via supabase-js (RLS injects user_id server-side via
 *      the bind trigger — the client never sends user_id).
 *   4. On success, clear sync_dirty for the pushed ids.
 *
 * Batch size caps a single request payload; Supabase/PostgREST has no hard
 * row limit but large payloads hurt cold-start latency and memory. 200 rows
 * keeps each round-trip well under the typical payload budget.
 */

const BATCH_SIZE = 200

export interface PushStats {
  table: string
  pushed: number
}

/** One row as read from SQLite (snake_case keys) — values are JSON-serialisable. */
type DbRow = Record<string, unknown>

/** Columns read from SQLite = data columns + control columns for LWW. */
const CONTROL_COLUMNS = ['updated_at', 'deleted_at'] as const

/**
 * Read all dirty rows for a table, including soft-deleted ones.
 * Returns data columns + updated_at + deleted_at (NOT sync_dirty — that is
 * local-only state and must not be sent to the server).
 */
async function readDirtyRows(def: SyncTableDef): Promise<DbRow[]> {
  const db = await getDb()
  const cols = [...def.columns, ...CONTROL_COLUMNS]
  const where = def.localFilter ? `WHERE sync_dirty = 1 AND (${def.localFilter})` : 'WHERE sync_dirty = 1'
  const sql = `SELECT ${cols.join(', ')} FROM ${def.local} ${where}`
  return db.select<DbRow[]>(sql, [])
}

/**
 * Push one table. Returns the count of rows pushed (and cleared).
 * Never throws — records errors via logSyncError so a single table failure
 * does not abort the whole sync pass.
 */
export async function pushTable(
  def: SyncTableDef,
): Promise<PushStats> {
  const stats: PushStats = { table: def.local, pushed: 0 }
  let rows: DbRow[]
  try {
    rows = await readDirtyRows(def)
  } catch (err) {
    console.error(`[sync.push] ${def.local}: read failed`, err)
    return stats
  }
  if (rows.length === 0) return stats

  const supabase = getSupabase()

  // Null out undefined values — PostgREST rejects undefined, and SQLite rows
  // may have NULL which serialise fine. Empty string stays as-is.
  const sanitised = rows.map((row) => {
    const clean: DbRow = {}
    for (const [k, v] of Object.entries(row)) {
      clean[k] = v === undefined ? null : v
    }
    return clean
  })

  for (let i = 0; i < sanitised.length; i += BATCH_SIZE) {
    const batch = sanitised.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from(def.remote)
      .upsert(batch, { onConflict: def.pk.join(','), ignoreDuplicates: false })

    if (error) {
      console.error(`[sync.push] ${def.local} batch ${i}:`, error.message)
      return stats // stop on first batch error; remaining rows stay dirty
    }
    stats.pushed += batch.length
  }

  // Clear the dirty flag only for rows we actually pushed. Re-running the
  // SELECT would be racy (a concurrent write could have dirtied new rows);
  // instead clear by timestamp watermark — anything dirty at-or-before `now`.
  try {
    await clearDirtyBefore(def, rows)
  } catch (err) {
    // Non-fatal: rows will be re-pushed next cycle (idempotent upsert).
    console.warn(`[sync.push] ${def.local}: clear-dirty failed`, err)
  }

  return stats
}

/**
 * Clear sync_dirty for rows whose updated_at is at or before the max we pushed.
 * This avoids wiping a row that was dirtied by a concurrent write between the
 * SELECT and the clear, while still clearing everything we just sent.
 */
async function clearDirtyBefore(def: SyncTableDef, pushedRows: DbRow[]): Promise<void> {
  if (pushedRows.length === 0) return
  const db = await getDb()
  const timestamps = pushedRows
    .map((r) => r.updated_at as string)
    .filter(Boolean)
  if (timestamps.length === 0) return
  const maxTs = timestamps.sort().pop()!
  const where = def.localFilter
    ? `WHERE sync_dirty = 1 AND updated_at <= ? AND (${def.localFilter})`
    : 'WHERE sync_dirty = 1 AND updated_at <= ?'
  await db.execute(`UPDATE ${def.local} SET sync_dirty = 0 ${where}`, [maxTs])
}
