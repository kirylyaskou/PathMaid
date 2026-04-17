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
    for (const stmt of statements) {
      await db.execute(stmt, [])
    }

    // INSERT OR IGNORE — defense against races where two concurrent runMigrations
    // calls both pass the applied-check for the same migration. The primary guard
    // is the initPromise cache in shared/api/db.ts, but this keeps migrate.ts
    // safe for any other caller that might run it directly.
    await db.execute('INSERT OR IGNORE INTO _migrations (name) VALUES (?)', [name])
    console.log(`[migrate] Applied: ${name}`)
  }
}
