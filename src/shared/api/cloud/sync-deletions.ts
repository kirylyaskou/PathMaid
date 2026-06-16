import { getDb } from '@/shared/db'

import { getSupabase } from './supabase-client'
import { removeCampaignAssetObjects } from './asset-sync'
import { SYNC_TABLE_BY_LOCAL } from './sync-tables'

/**
 * Push hard-deletes (tombstones from sync_deletions) to the remote mirror.
 *
 * The AFTER DELETE triggers (migration 0060) record each removed row's PK as a
 * JSON array. Here we group unpushed tombstones by table, issue a server-side
 * DELETE for each, and mark the tombstones as pushed on success.
 *
 * The remote row is deleted unconditionally — LWW does not apply to deletions
 * because the local user explicitly removed the row. If the same row was
 * concurrently edited remotely, the deletion wins (delete is a terminal state
 * for personal sync; an undo would require restoring from history).
 */

export interface DeletionPushStats {
  table: string
  deleted: number
}

interface TombstoneRow {
  id: number
  table_name: string
  row_key: string
}

/**
 * Push all unpushed tombstones across every synced table.
 * Returns per-table counts. Never throws; errors are logged per-table.
 */
export async function pushDeletions(): Promise<DeletionPushStats[]> {
  const db = await getDb()
  const tombstones = await db.select<TombstoneRow[]>(
    `SELECT id, table_name, row_key
       FROM sync_deletions
      WHERE pushed = 0
      ORDER BY table_name, id`,
    [],
  )
  if (tombstones.length === 0) return []

  const supabase = getSupabase()

  // Group tombstone ids + keys by table so we can batch the remote DELETE.
  const byTable = new Map<string, { ids: number[]; keys: unknown[][] }>()
  for (const t of tombstones) {
    // Skip tombstones for tables no longer in the sync registry (defensive —
    // a table could have been removed from SYNC_TABLES after a tombstone was
    // recorded). Mark them pushed so they don't accumulate forever.
    if (!SYNC_TABLE_BY_LOCAL.has(t.table_name)) {
      await db.execute('UPDATE sync_deletions SET pushed = 1 WHERE id = ?', [t.id])
      continue
    }
    let group = byTable.get(t.table_name)
    if (!group) {
      group = { ids: [], keys: [] }
      byTable.set(t.table_name, group)
    }
    group.ids.push(t.id)
    try {
      group.keys.push(JSON.parse(t.row_key))
    } catch {
      // Malformed row_key — mark pushed to skip it permanently.
      await db.execute('UPDATE sync_deletions SET pushed = 1 WHERE id = ?', [t.id])
    }
  }

  const stats: DeletionPushStats[] = []
  for (const [tableName, group] of byTable) {
    const def = SYNC_TABLE_BY_LOCAL.get(tableName)!
    // Build the .in() filter: PostgREST matches on the PK columns in order.
    // For a single-PK table, .in('id', [v1, v2]). For composite PKs, we send
    // one DELETE per row because PostgREST's .in() does not support composite
    // tuples — acceptable since composite-PK deletions are rare (override rows
    // that cascade from their parent).
    try {
      if (tableName === 'campaign_assets') {
        const assetIds = group.keys.map((key) => String(key[0]))
        const assetStats = await removeCampaignAssetObjects(assetIds)
        if (assetStats.errors.length > 0) {
          console.error(`[sync.del] ${tableName} assets:`, assetStats.errors.join('; '))
          continue
        }
      }

      if (def.pk.length === 1) {
        const col = def.pk[0]!
        const values = group.keys.map((k) => String(k[0]))
        const { error } = await supabase.from(def.remote).delete().in(col, values)
        if (error) {
          console.error(`[sync.del] ${tableName}:`, error.message)
          continue
        }
      } else {
        // Composite PK: delete row by row with an AND filter.
        let ok = 0
        for (const key of group.keys) {
          let q = supabase.from(def.remote).delete()
          for (let i = 0; i < def.pk.length; i++) {
            q = q.eq(def.pk[i]!, String(key[i]))
          }
          const { error } = await q
          if (error) {
            console.error(`[sync.del] ${tableName} composite:`, error.message)
            break
          }
          ok++
        }
        if (ok === 0) continue
      }
    } catch (err) {
      console.error(`[sync.del] ${tableName} threw:`, err)
      continue
    }

    // Mark these tombstones pushed.
    const placeholders = group.ids.map(() => '?').join(', ')
    await db.execute(
      `UPDATE sync_deletions SET pushed = 1 WHERE id IN (${placeholders})`,
      group.ids,
    )
    stats.push({ table: tableName, deleted: group.ids.length })
  }

  return stats
}

/** Remove pushed tombstones older than 30 days (housekeeping). */
export async function pruneOldTombstones(days = 30): Promise<void> {
  const db = await getDb()
  await db.execute(
    `DELETE FROM sync_deletions
      WHERE pushed = 1
        AND deleted_at < datetime('now', ?)`,
    [`-${days} days`],
  )
}
