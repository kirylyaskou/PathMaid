import { getDb, runMigrations } from '@/shared/db'

// Module-level guard: React StrictMode fires the SplashScreen useEffect twice in
// dev, which launched two parallel initDatabase() calls. They race through the
// migration loop and produced `UNIQUE constraint failed: _migrations.name` when
// both INSERT'ed the same migration record. Cache the in-flight promise so
// concurrent callers share it.
let initPromise: Promise<void> | null = null

export async function initDatabase(): Promise<void> {
  if (initPromise) return initPromise
  initPromise = (async () => {
    const db = await getDb()
    await db.execute('PRAGMA journal_mode=WAL', [])
    await db.execute('PRAGMA foreign_keys=ON', [])
    await runMigrations(db)
  })().catch((err) => {
    // Clear the cache on failure so the user's Retry button actually retries.
    initPromise = null
    throw err
  })
  return initPromise
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
