import { getDb } from '@/shared/db'

import { getSupabase } from './supabase-client'
import { SYNC_TABLE_BY_LOCAL, type SyncTableDef } from './sync-tables'

const EMPTY_REMOTE_GUARD_TABLES = [
  'campaigns',
  'campaign_nodes',
  'campaign_documents',
  'campaign_tables',
  'campaign_assets',
  'campaign_node_artworks',
  'encounters',
  'encounter_combatants',
  'characters',
  'custom_creatures',
  'custom_items',
] as const

interface EmptyRemoteGuardResult {
  safe: boolean
  localRows: number
  remoteRows: number
  message?: string
}

function localAliveWhere(def: SyncTableDef): string {
  const parts = ['deleted_at IS NULL']
  if (def.localFilter) parts.push(`(${def.localFilter})`)
  return parts.join(' AND ')
}

async function countLocalRows(def: SyncTableDef): Promise<number> {
  const db = await getDb()
  const rows = await db.select<Array<{ count: number }>>(
    `SELECT COUNT(*) AS count FROM ${def.local} WHERE ${localAliveWhere(def)}`,
    [],
  )
  return Number(rows[0]?.count ?? 0)
}

async function countRemoteRows(def: SyncTableDef): Promise<number> {
  let query = getSupabase()
    .from(def.remote)
    .select(def.pk[0]!, { count: 'exact', head: true })
    .is('deleted_at', null)

  if (def.remoteFilter) {
    const match = /^(\w+)\s+IS\s+NULL$/i.exec(def.remoteFilter.trim())
    if (match) query = query.is(match[1]!, null)
  }

  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

export async function checkEmptyRemoteGuard(): Promise<EmptyRemoteGuardResult> {
  let localRows = 0
  let remoteRows = 0

  for (const tableName of EMPTY_REMOTE_GUARD_TABLES) {
    const def = SYNC_TABLE_BY_LOCAL.get(tableName)
    if (!def) continue
    localRows += await countLocalRows(def)
    remoteRows += await countRemoteRows(def)
  }

  if (localRows > 0 && remoteRows === 0) {
    return {
      safe: false,
      localRows,
      remoteRows,
      message:
        'Cloud sync blocked: Supabase has no user data, but this device has local data. Use Push all from the backup device to seed cloud data explicitly.',
    }
  }

  return { safe: true, localRows, remoteRows }
}
