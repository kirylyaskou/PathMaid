import { getDb } from '@/shared/db'

import { getSupabase } from './supabase-client'
import { shouldApplyRemote, normaliseTimestamp } from './sync-conflict'
import { getLastPullAt, setLastPullAt, logSyncError } from './sync-progress'
import type { SyncTableDef } from './sync-tables'

/**
 * Pull remote changes into the local mirror.
 *
 * For each synced table:
 *   1. Ask the server for rows with updated_at > last_pull_at watermark
 *      (incremental pull). First-ever sync has no watermark → full pull.
 *   2. For each remote row, compare against the local row's updated_at using
 *      LWW: apply only when the remote is strictly newer.
 *   3. UPSERT applied rows into SQLite. Soft-deleted rows (deleted_at set)
 *      are applied too — their deleted_at tombstone marks them locally.
 *   4. Advance the watermark to the max updated_at seen.
 *
 * Why a second SELECT per row for LWW: pulling is a cold path (once a minute
 * or on demand), and correctness beats the N extra reads. A naive blind
 * upsert would clobber a local edit that hasn't been pushed yet.
 */

export interface PullStats {
  table: string
  pulled: number
  applied: number
  skipped: number
}

type RemoteRow = Record<string, unknown>

/**
 * Pull one table. Returns counts; never throws (errors logged + returned as 0).
 */
export async function pullTable(def: SyncTableDef): Promise<PullStats> {
  const stats: PullStats = { table: def.local, pulled: 0, applied: 0, skipped: 0 }
  const supabase = getSupabase()
  const lastPullAt = await getLastPullAt(def.local)

  // PostgREST range/pagination: pull in pages of 1000 to bound memory on a
  // full first-sync of a large campaign. updated_at ascending so the
  // watermark advances correctly and re-pulls resume after the last seen row.
  const PAGE_SIZE = 1000
  let offset = 0
  let maxSeen: string | null = null
  const deferredRows: RemoteRow[] = []
  // Cap pages to avoid an infinite loop if a misbehaving query keeps returning
  // the same rows — defensive, should never trigger in practice.
  const MAX_PAGES = 500

  for (let page = 0; page < MAX_PAGES; page++) {
    let query = supabase
      .from(def.remote)
      .select('*')
      .order('updated_at', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)

    if (lastPullAt) {
      query = query.gt('updated_at', lastPullAt)
    }
    // remoteFilter currently only expresses "<col> IS NULL" (the sole case in
    // the registry: characters.source_adventure IS NULL). Translate it to the
    // supabase-js .is() builder rather than a raw PostgREST filter string,
    // which keeps the query type-safe and avoids filter() signature pitfalls.
    if (def.remoteFilter) {
      const m = /^(\w+)\s+IS\s+NULL$/i.exec(def.remoteFilter.trim())
      if (m) {
        query = query.is(m[1]!, null)
      }
    }

    const { data, error } = await query
    if (error) {
      console.error(`[sync.pull] ${def.local}:`, error.message)
      await logSyncError(def.local, 'pull', error.message)
      return stats
    }
    if (!data || data.length === 0) break

    const remoteRows = data as RemoteRow[]
    stats.pulled += remoteRows.length

    // campaign_nodes has a self-FK, so updated_at order can place a child
    // before its parent on first pull.
    if (def.local === 'campaign_nodes') {
      deferredRows.push(...remoteRows)
      if (data.length < PAGE_SIZE) break // last page
      offset += PAGE_SIZE
      continue
    }

    for (const row of remoteRows) {
      const applied = await applyRemoteRow(def, row)
      if (applied) stats.applied++
      else stats.skipped++

      const rowTs = normaliseTimestamp(row.updated_at as string)
      if (rowTs && (maxSeen === null || rowTs > maxSeen)) maxSeen = rowTs
    }

    if (data.length < PAGE_SIZE) break // last page
    offset += PAGE_SIZE
  }

  for (const row of orderCampaignNodeRowsForPull(deferredRows)) {
    const applied = await applyRemoteRow(def, row)
    if (applied) stats.applied++
    else stats.skipped++

    const rowTs = normaliseTimestamp(row.updated_at as string)
    if (rowTs && (maxSeen === null || rowTs > maxSeen)) maxSeen = rowTs
  }

  // Advance watermark only after a successful pass. If we crashed mid-way the
  // un-advanced watermark ensures the next pull re-fetches the missing tail.
  if (maxSeen) {
    try {
      await setLastPullAt(def.local, maxSeen)
    } catch (err) {
      console.warn(`[sync.pull] ${def.local}: watermark update failed`, err)
    }
  }

  return stats
}

function orderCampaignNodeRowsForPull(rows: RemoteRow[]): RemoteRow[] {
  if (rows.length < 2) return rows

  const byId = new Map<string, RemoteRow>()
  for (const row of rows) {
    if (typeof row.id === 'string') byId.set(row.id, row)
  }

  const ordered: RemoteRow[] = []
  const visited = new Set<string>()
  const visiting = new Set<string>()

  const visit = (row: RemoteRow) => {
    const id = typeof row.id === 'string' ? row.id : null
    if (!id) {
      ordered.push(row)
      return
    }
    if (visited.has(id) || visiting.has(id)) return

    visiting.add(id)
    const parentId = typeof row.parent_id === 'string' ? row.parent_id : null
    const parent = parentId ? byId.get(parentId) : undefined
    if (parent) visit(parent)
    visiting.delete(id)

    visited.add(id)
    ordered.push(row)
  }

  for (const row of rows) visit(row)
  return ordered
}

/**
 * Upsert a single remote row into SQLite, gated by LWW.
 * Strips server-only columns (user_id) that have no local counterpart.
 * Returns true if applied, false if skipped (local newer).
 */
async function applyRemoteRow(def: SyncTableDef, remote: RemoteRow): Promise<boolean> {
  const db = await getDb()
  const remoteUpdatedAt = normaliseTimestamp(remote.updated_at as string)
  if (!remoteUpdatedAt) return false

  // Read the local row's updated_at for LWW comparison. Build a WHERE clause
  // matching on all PK columns.
  const pkVals = def.pk.map((col) => remote[col])
  const pkWhere = def.pk.map((col) => `${col} = ?`).join(' AND ')

  const localRows = await db.select<{ updated_at: string | null }[]>(
    `SELECT updated_at FROM ${def.local} WHERE ${pkWhere}`,
    pkVals,
  )
  const localUpdatedAt = normaliseTimestamp(localRows[0]?.updated_at ?? null)

  if (!shouldApplyRemote(localUpdatedAt, remoteUpdatedAt)) {
    return false
  }

  // Build the upsert. Columns = def.columns + sync-control fields.
  // user_id is dropped (it exists only on the server), and remote rows should
  // land clean locally instead of immediately entering the next push batch.
  const cols = [...def.columns, 'updated_at', 'deleted_at', 'sync_dirty']
  const vals = cols.map((col) => {
    if (col === 'sync_dirty') return 0
    const v = remote[col]
    return v === undefined ? null : v
  })
  const placeholders = cols.map(() => '?').join(', ')
  const conflictTargets = def.pk.join(', ')
  const updateCols = cols.filter((c) => !def.pk.includes(c))
  const updateClause = updateCols
    .map((c) => `${c} = excluded.${c}`)
    .join(', ')

  await db.execute(
    `INSERT INTO ${def.local} (${cols.join(', ')})
     VALUES (${placeholders})
     ON CONFLICT(${conflictTargets}) DO UPDATE SET ${updateClause}`,
    vals,
  )
  await db.execute(
    `UPDATE ${def.local} SET sync_dirty = 0 WHERE sync_dirty = 1 AND ${pkWhere}`,
    pkVals,
  )
  return true
}
