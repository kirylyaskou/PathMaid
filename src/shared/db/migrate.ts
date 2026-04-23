import type Database from '@tauri-apps/plugin-sql'

const migrationFiles = import.meta.glob('./migrations/*.sql', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

export async function runMigrations(db: Database): Promise<void> {
  await db.execute(
    `CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    []
  )

  const sorted = Object.entries(migrationFiles).sort(([a], [b]) =>
    a.localeCompare(b)
  )

  for (const [path, sql] of sorted) {
    const name = path.split('/').pop()!
    const applied = await db.select<{ name: string }[]>(
      'SELECT name FROM _migrations WHERE name = ?',
      [name]
    )
    if (applied.length > 0) continue

    console.log(`[migrate] Applying: ${name}`)
    // Strip SQL line comments before splitting so that any `;` inside a comment
    // does not corrupt the statement stream. Assumes our migrations do not
    // contain `--` inside string literals (true for every migration to date).
    const statements = sql
      .replace(/--[^\n]*/g, '')
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      try {
        await db.execute(stmt, [])
      } catch (err) {
        // Rich error message so the SplashScreen surface points at the exact
        // failing migration + statement in production. SQLite errors from the
        // plugin only carry the terse code ("no such table: foo") without
        // migration context — which made clean-install triage guesswork.
        const snippet = stmt.replace(/\s+/g, ' ').slice(0, 140)
        const msg = err instanceof Error ? err.message : String(err)
        throw new Error(
          `[migrate] ${name} failed at statement #${i + 1}: ${msg}\nSQL: ${snippet}${stmt.length > 140 ? '…' : ''}`,
        )
      }
    }

    // INSERT OR IGNORE — defense against races where two concurrent runMigrations
    // calls both pass the applied-check for the same migration. The primary guard
    // is the initPromise cache in shared/api/db.ts, but this keeps migrate.ts
    // safe for any other caller that might run it directly.
    await db.execute('INSERT OR IGNORE INTO _migrations (name) VALUES (?)', [name])
    console.log(`[migrate] Applied: ${name}`)
  }
}
