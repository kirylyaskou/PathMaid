import { getDb, runMigrations } from '@/shared/db'
import { loadContentTranslations } from '@/shared/i18n'

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
    // IMPORTANT: foreign_keys MUST be OFF during migrations. Several migrations
    // (0030 spell_effects_fk_cascade, 0034 effects_granted_by) use SQLite's
    // table-rebuild pattern — CREATE *_new → INSERT SELECT → DROP original →
    // RENAME. With FK=ON, DROP on a parent table is blocked by child FKs and
    // the rebuild chain fails with "no such table: …" on the next migration.
    // SQLite docs recommend FK=OFF during schema changes; we re-enable after.
    await db.execute('PRAGMA foreign_keys=OFF', [])
    await runMigrations(db)
    await db.execute('PRAGMA foreign_keys=ON', [])

    // Seed bundled content translations (Phase 78). Idempotent via unique
    // index + INSERT OR REPLACE — safe to re-run on every startup.
    // Silent-fail: translation loader errors must not block app init.
    try {
      await loadContentTranslations(db)
    } catch (err) {
      console.warn('[db] loadContentTranslations failed (non-fatal):', err)
    }
  })().catch((err) => {
    // Clear the cache on failure so the user's Retry button actually retries.
    initPromise = null
    throw err
  })
  return initPromise
}

/**
 * Gracefully shut down the SQLite connection before a destructive process
 * transition (Windows NSIS installer writes over pathmaid.db; if tauri-plugin-sql
 * still holds the WAL lock the installer fails with "Failed to kill" — Tauri bug
 * #12309). Called as the first step of downloadAndInstallUpdate so the Rust side
 * releases the file handle before the new binary tries to overwrite it.
 *
 * Silent-fail: if close() throws we log and continue — blocking the update
 * because DB close misbehaved is worse than attempting install with a warning.
 * `initPromise` is reset in `finally` so that if the user stays in the app after
 * an install failure, the next query triggers a fresh init.
 */
export async function closeDatabase(): Promise<void> {
  try {
    const db = await getDb()
    await db.close()
  } catch (e) {
    console.warn('[db] close failed (non-fatal):', e)
  } finally {
    initPromise = null
  }
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
