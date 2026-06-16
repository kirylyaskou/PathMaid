import { getDb } from '@/shared/db'

import { isSyncedTable } from './sync-tables'

/**
 * Helper for write functions to flag rows as locally-changed and pending push.
 *
 * After any INSERT/UPDATE/DELETE on a synced table, the caller invokes
 * `markDirty` with the table and the PK values of the affected rows. This:
 *   - stamps updated_at = now (the LWW watermark), and
 *   - sets sync_dirty = 1 (queues the row for the next push).
 *
 * For soft-delete (tombstone) semantics use `markDeleted`, which sets
 * deleted_at instead of removing the row — the remote still needs to learn
 * about the deletion.
 *
 * Safe no-op for non-synced tables: the guard lets write functions call this
 * unconditionally without checking isSyncedTable themselves.
 */

/**
 * Build a WHERE clause matching rows by a single-column PK.
 * Returns '' for composite PKs — use markDirtyComposite there.
 */
function pkInClause(pkCol: string, count: number): string {
  const placeholders = Array.from({ length: count }, () => '?').join(', ')
  return `${pkCol} IN (${placeholders})`
}

/**
 * Stamp updated_at + sync_dirty = 1 for rows identified by a single-column PK.
 */
export async function markDirty(
  table: string,
  ids: string[],
): Promise<void> {
  if (!isSyncedTable(table) || ids.length === 0) return
  const db = await getDb()
  const now = new Date().toISOString()
  await db.execute(
    `UPDATE ${table}
       SET updated_at = ?, sync_dirty = 1
     WHERE ${pkInClause('id', ids.length)}`,
    [now, ...ids],
  )
}

/**
 * Stamp a single row dirty by its own PK column (not necessarily 'id').
 */
export async function markDirtyByColumn(
  table: string,
  pkCol: string,
  id: string,
): Promise<void> {
  if (!isSyncedTable(table)) return
  const db = await getDb()
  const now = new Date().toISOString()
  await db.execute(
    `UPDATE ${table}
       SET updated_at = ?, sync_dirty = 1
     WHERE ${pkCol} = ?`,
    [now, id],
  )
}

/**
 * Soft-delete (tombstone) rows by single-column PK.
 * Sets deleted_at + sync_dirty so the deletion propagates on next push.
 */
export async function markDeleted(
  table: string,
  ids: string[],
): Promise<void> {
  if (!isSyncedTable(table) || ids.length === 0) return
  const db = await getDb()
  const now = new Date().toISOString()
  await db.execute(
    `UPDATE ${table}
       SET deleted_at = ?, sync_dirty = 1
     WHERE ${pkInClause('id', ids.length)}`,
    [now, ...ids],
  )
}
