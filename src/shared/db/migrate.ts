import type Database from '@tauri-apps/plugin-sql'

const migrationFiles = import.meta.glob('./migrations/*.sql', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

function isIncompleteTriggerStatement(statement: string): boolean {
  return /^\s*CREATE\s+(?:TEMP\s+|TEMPORARY\s+)?TRIGGER\b/i.test(statement)
    && !/\bEND\s*;?\s*$/i.test(statement)
}

function splitMigrationStatements(sql: string): string[] {
  const withoutComments = sql.replace(/--[^\n]*/g, '')
  const statements: string[] = []
  let current = ''
  let inSingleQuote = false
  let inDoubleQuote = false

  for (let i = 0; i < withoutComments.length; i++) {
    const ch = withoutComments[i]!
    const next = withoutComments[i + 1]
    current += ch

    if (ch === "'" && !inDoubleQuote) {
      if (inSingleQuote && next === "'") {
        current += next
        i++
      } else {
        inSingleQuote = !inSingleQuote
      }
      continue
    }

    if (ch === '"' && !inSingleQuote) {
      if (inDoubleQuote && next === '"') {
        current += next
        i++
      } else {
        inDoubleQuote = !inDoubleQuote
      }
      continue
    }

    if (ch !== ';' || inSingleQuote || inDoubleQuote) continue

    const statement = current.trim()
    if (!statement) {
      current = ''
      continue
    }

    if (isIncompleteTriggerStatement(statement)) continue

    statements.push(statement.replace(/;\s*$/, '').trim())
    current = ''
  }

  const tail = current.trim()
  if (tail) statements.push(tail)
  return statements
}

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

  // One SELECT instead of N — saves an IPC round-trip per migration on
  // warm boots where every migration is already applied. Building a Set
  // for O(1) `has()` checks below.
  const appliedRows = await db.select<{ name: string }[]>(
    'SELECT name FROM _migrations',
    [],
  )
  const appliedSet = new Set(appliedRows.map((r) => r.name))

  for (const [path, sql] of sorted) {
    const name = path.split('/').pop()!
    if (appliedSet.has(name)) continue

    console.log(`[migrate] Applying: ${name}`)
    const statements = splitMigrationStatements(sql)
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      try {
        await db.execute(stmt, [])
      } catch (err) {
        // SQLite has no `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. A migration
        // that adds many columns can be interrupted mid-way (crash, force-quit);
        // columns added before the failure persist, but the migration itself is
        // not recorded as applied — so on the next launch it re-runs from the
        // top and trips on `duplicate column name`. Treat that single, benign
        // case as success so the migration self-heals instead of bricking the
        // database. All other errors still abort with full context below.
        const msg = err instanceof Error ? err.message : String(err)
        const isDuplicateColumn =
          /^\s*ALTER\s+TABLE\s+.*\bADD\s+COLUMN\b/i.test(stmt) &&
          /duplicate column name/i.test(msg)
        if (isDuplicateColumn) {
          console.warn(`[migrate] ${name}: skipping already-applied column (${msg})`)
          continue
        }
        const snippet = stmt.replace(/\s+/g, ' ').slice(0, 140)
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
