import { getDb, runMigrations } from '@/shared/db'

export async function initDatabase(): Promise<void> {
  console.log('[initDB] Opening connection...')
  const db = await getDb()
  console.log('[initDB] Setting PRAGMAs...')
  await db.execute('PRAGMA journal_mode=WAL', [])
  await db.execute('PRAGMA foreign_keys=ON', [])
  console.log('[initDB] Running migrations...')
  await runMigrations(db)
  console.log('[initDB] Done.')
}

export async function getSyncMetadata(
  key: string
): Promise<string | null> {
  const db = await getDb()
  const rows = await db.select<{ value: string }[]>(
    'SELECT value FROM sync_metadata WHERE key = ?',
    [key]
  )
  return rows.length > 0 ? rows[0].value : null
}

export async function setSyncMetadata(
  key: string,
  value: string
): Promise<void> {
  const db = await getDb()
  await db.execute(
    'INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?)',
    [key, value]
  )
}
