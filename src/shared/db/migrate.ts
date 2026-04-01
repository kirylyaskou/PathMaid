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

    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    for (const stmt of statements) {
      await db.execute(stmt, [])
    }

    await db.execute('INSERT INTO _migrations (name) VALUES (?)', [name])
  }
}
