import { getDb } from '@/shared/db'

/**
 * Per-table sync watermarks stored in the local `sync_progress` table.
 *
 * `last_pull_at` is the high-water mark of remote updated_at already applied
 * locally. The next pull asks the server for rows newer than this. Storing it
 * locally (not just in-memory) means sync resumes correctly after a restart
 * without re-pulling the entire history.
 *
 * All timestamps are ISO strings (UTC). Null means "never synced" → full pull.
 */

interface ProgressRow {
  table_name: string
  last_pull_at: string | null
  last_push_at: string | null
}

export async function getLastPullAt(tableName: string): Promise<string | null> {
  const db = await getDb()
  const rows = await db.select<Pick<ProgressRow, 'last_pull_at'>[]>(
    'SELECT last_pull_at FROM sync_progress WHERE table_name = ?',
    [tableName],
  )
  return rows[0]?.last_pull_at ?? null
}

export async function setLastPullAt(
  tableName: string,
  timestamp: string,
): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT INTO sync_progress (table_name, last_pull_at, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(table_name) DO UPDATE SET
       last_pull_at = excluded.last_pull_at,
       updated_at = excluded.updated_at`,
    [tableName, timestamp, new Date().toISOString()],
  )
}

export async function setLastPushAt(
  tableName: string,
  timestamp: string,
): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT INTO sync_progress (table_name, last_push_at, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(table_name) DO UPDATE SET
       last_push_at = excluded.last_push_at,
       updated_at = excluded.updated_at`,
    [tableName, timestamp, new Date().toISOString()],
  )
}

/** Log a sync failure so the UI can surface "last sync failed: <reason>". */
export async function logSyncError(
  tableName: string,
  direction: 'push' | 'pull',
  message: string,
  payload?: unknown,
): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT INTO sync_errors (table_name, direction, message, payload)
     VALUES (?, ?, ?, ?)`,
    [tableName, direction, message, payload ? JSON.stringify(payload) : null],
  )
}

/** Reset all watermarks — used by "force full re-sync" / first-login pull. */
export async function resetAllProgress(): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM sync_progress', [])
}
