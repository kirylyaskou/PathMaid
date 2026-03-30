import Database from '@tauri-apps/plugin-sql';

interface Migration {
  version: number;
  name: string;
  sql: string[];
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    sql: [
      `CREATE TABLE IF NOT EXISTS pf2e_entities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id TEXT NOT NULL,
        pack TEXT NOT NULL,
        slug TEXT NOT NULL,
        name TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        raw_data TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        synced_at TEXT NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_pack_slug ON pf2e_entities(pack, slug)`,
      `CREATE INDEX IF NOT EXISTS idx_entity_type ON pf2e_entities(entity_type)`,
      `CREATE INDEX IF NOT EXISTS idx_name ON pf2e_entities(name)`,
      `CREATE INDEX IF NOT EXISTS idx_source_id ON pf2e_entities(source_id)`,
      `CREATE TABLE IF NOT EXISTS sync_state (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        last_release TEXT,
        last_sync_at TEXT,
        total_entities INTEGER
      )`,
      `CREATE TABLE IF NOT EXISTS campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    ],
  },
  {
    version: 2,
    name: 'fts5_generated_columns',
    sql: [
      // Step 1: Recreate pf2e_entities with STORED generated columns for level and rarity.
      // STORED columns cannot be added via ALTER TABLE in SQLite — table recreation is required.
      `CREATE TABLE pf2e_entities_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id TEXT NOT NULL,
        pack TEXT NOT NULL,
        slug TEXT NOT NULL,
        name TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        raw_data TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        synced_at TEXT NOT NULL,
        level INTEGER GENERATED ALWAYS AS (
          CAST(json_extract(raw_data, '$.system.level.value') AS INTEGER)
        ) STORED,
        rarity TEXT GENERATED ALWAYS AS (
          json_extract(raw_data, '$.system.traits.rarity')
        ) STORED
      )`,
      // Step 2: Copy existing data (generated columns are computed automatically on insert)
      `INSERT INTO pf2e_entities_new(id, source_id, pack, slug, name, entity_type, raw_data, content_hash, synced_at)
        SELECT id, source_id, pack, slug, name, entity_type, raw_data, content_hash, synced_at FROM pf2e_entities`,
      // Step 3: Drop old table
      `DROP TABLE pf2e_entities`,
      // Step 4: Rename new table
      `ALTER TABLE pf2e_entities_new RENAME TO pf2e_entities`,
      // Step 5: Recreate all original indexes (lost during DROP TABLE)
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_pack_slug ON pf2e_entities(pack, slug)`,
      `CREATE INDEX IF NOT EXISTS idx_entity_type ON pf2e_entities(entity_type)`,
      `CREATE INDEX IF NOT EXISTS idx_name ON pf2e_entities(name)`,
      `CREATE INDEX IF NOT EXISTS idx_source_id ON pf2e_entities(source_id)`,
      // Step 6: Create new indexes for generated columns
      `CREATE INDEX IF NOT EXISTS idx_level ON pf2e_entities(level)`,
      `CREATE INDEX IF NOT EXISTS idx_rarity ON pf2e_entities(rarity)`,
      `CREATE INDEX IF NOT EXISTS idx_entity_type_level ON pf2e_entities(entity_type, level)`,
      // Step 7: Create FTS5 virtual table in external-content mode with unicode61 tokenizer.
      // External-content mode saves disk by pointing at pf2e_entities; triggers keep it in sync.
      `CREATE VIRTUAL TABLE pf2e_fts USING fts5(
        name,
        entity_type,
        pack,
        content='pf2e_entities',
        content_rowid='id',
        tokenize='unicode61'
      )`,
      // Step 8a: INSERT trigger — add new entity to FTS index
      `CREATE TRIGGER pf2e_fts_ai AFTER INSERT ON pf2e_entities BEGIN
        INSERT INTO pf2e_fts(rowid, name, entity_type, pack)
        VALUES (new.id, new.name, new.entity_type, new.pack);
      END`,
      // Step 8b: DELETE trigger — remove deleted entity from FTS index
      `CREATE TRIGGER pf2e_fts_ad AFTER DELETE ON pf2e_entities BEGIN
        INSERT INTO pf2e_fts(pf2e_fts, rowid, name, entity_type, pack)
        VALUES ('delete', old.id, old.name, old.entity_type, old.pack);
      END`,
      // Step 8c: UPDATE trigger — CRITICAL: delete old values BEFORE inserting new ones.
      // Reversed order corrupts the FTS index with stale tokens.
      // Note: INSERT OR REPLACE fires pf2e_fts_ad + pf2e_fts_ai (DELETE+INSERT at SQLite level) — correct behavior.
      `CREATE TRIGGER pf2e_fts_au AFTER UPDATE ON pf2e_entities BEGIN
        INSERT INTO pf2e_fts(pf2e_fts, rowid, name, entity_type, pack)
        VALUES ('delete', old.id, old.name, old.entity_type, old.pack);
        INSERT INTO pf2e_fts(rowid, name, entity_type, pack)
        VALUES (new.id, new.name, new.entity_type, new.pack);
      END`,
      // Step 9: Rebuild FTS5 index for any pre-existing data.
      // CRITICAL: External-content triggers are not retroactive — without this, existing
      // entities are invisible to MATCH queries until the next sync overwrites them.
      `INSERT INTO pf2e_fts(pf2e_fts) VALUES ('rebuild')`,
    ],
  },
  {
    version: 3,
    name: 'family_generated_column',
    sql: [
      // Step 1: Recreate pf2e_entities with family STORED generated column
      // JSON path: $.system.details.family (MEDIUM confidence — verify with spot-check SQL)
      `CREATE TABLE pf2e_entities_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id TEXT NOT NULL,
        pack TEXT NOT NULL,
        slug TEXT NOT NULL,
        name TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        raw_data TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        synced_at TEXT NOT NULL,
        level INTEGER GENERATED ALWAYS AS (
          CAST(json_extract(raw_data, '$.system.level.value') AS INTEGER)
        ) STORED,
        rarity TEXT GENERATED ALWAYS AS (
          json_extract(raw_data, '$.system.traits.rarity')
        ) STORED,
        family TEXT GENERATED ALWAYS AS (
          json_extract(raw_data, '$.system.details.family')
        ) STORED
      )`,
      // Step 2: Copy data (omit generated columns — SQLite computes them)
      `INSERT INTO pf2e_entities_new(id, source_id, pack, slug, name, entity_type, raw_data, content_hash, synced_at)
        SELECT id, source_id, pack, slug, name, entity_type, raw_data, content_hash, synced_at FROM pf2e_entities`,
      // Step 3: Drop old table
      `DROP TABLE pf2e_entities`,
      // Step 4: Rename new table
      `ALTER TABLE pf2e_entities_new RENAME TO pf2e_entities`,
      // Step 5: Recreate ALL v1+v2 indexes (lost when old table was dropped)
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_pack_slug ON pf2e_entities(pack, slug)`,
      `CREATE INDEX IF NOT EXISTS idx_entity_type ON pf2e_entities(entity_type)`,
      `CREATE INDEX IF NOT EXISTS idx_name ON pf2e_entities(name)`,
      `CREATE INDEX IF NOT EXISTS idx_source_id ON pf2e_entities(source_id)`,
      `CREATE INDEX IF NOT EXISTS idx_level ON pf2e_entities(level)`,
      `CREATE INDEX IF NOT EXISTS idx_rarity ON pf2e_entities(rarity)`,
      `CREATE INDEX IF NOT EXISTS idx_entity_type_level ON pf2e_entities(entity_type, level)`,
      // Step 6: New index for family column
      `CREATE INDEX IF NOT EXISTS idx_family ON pf2e_entities(family)`,
      // Note: FTS5 triggers (pf2e_fts_ai, pf2e_fts_ad, pf2e_fts_au) reference
      // pf2e_entities by name — after rename, the table name matches again.
      // Do NOT recreate FTS triggers or virtual table.
    ],
  },
  {
    version: 4,
    name: 'fix_npc_level_json_path',
    sql: [
      // The level STORED generated column previously used $.system.level.value
      // which is the PC character JSON path. PF2e NPC (entity_type = 'npc') data
      // stores level at $.system.details.level.value. All NPCs had level = NULL
      // because the path was wrong. This migration recreates the table with the
      // correct path so level badges work for all creatures.
      //
      // COALESCE tries the NPC path first, then falls back to the character path,
      // so both actor types produce a valid level value after this migration.
      `CREATE TABLE pf2e_entities_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id TEXT NOT NULL,
        pack TEXT NOT NULL,
        slug TEXT NOT NULL,
        name TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        raw_data TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        synced_at TEXT NOT NULL,
        level INTEGER GENERATED ALWAYS AS (
          CAST(COALESCE(
            json_extract(raw_data, '$.system.details.level.value'),
            json_extract(raw_data, '$.system.level.value')
          ) AS INTEGER)
        ) STORED,
        rarity TEXT GENERATED ALWAYS AS (
          json_extract(raw_data, '$.system.traits.rarity')
        ) STORED,
        family TEXT GENERATED ALWAYS AS (
          json_extract(raw_data, '$.system.details.family')
        ) STORED
      )`,
      // Copy data — generated columns are recomputed automatically on INSERT
      `INSERT INTO pf2e_entities_new(id, source_id, pack, slug, name, entity_type, raw_data, content_hash, synced_at)
        SELECT id, source_id, pack, slug, name, entity_type, raw_data, content_hash, synced_at FROM pf2e_entities`,
      `DROP TABLE pf2e_entities`,
      `ALTER TABLE pf2e_entities_new RENAME TO pf2e_entities`,
      // Recreate all indexes
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_pack_slug ON pf2e_entities(pack, slug)`,
      `CREATE INDEX IF NOT EXISTS idx_entity_type ON pf2e_entities(entity_type)`,
      `CREATE INDEX IF NOT EXISTS idx_name ON pf2e_entities(name)`,
      `CREATE INDEX IF NOT EXISTS idx_source_id ON pf2e_entities(source_id)`,
      `CREATE INDEX IF NOT EXISTS idx_level ON pf2e_entities(level)`,
      `CREATE INDEX IF NOT EXISTS idx_rarity ON pf2e_entities(rarity)`,
      `CREATE INDEX IF NOT EXISTS idx_entity_type_level ON pf2e_entities(entity_type, level)`,
      `CREATE INDEX IF NOT EXISTS idx_family ON pf2e_entities(family)`,
      // Note: FTS5 virtual table and triggers reference pf2e_entities by name —
      // after the rename they point at the new table automatically.
    ],
  },
  {
    version: 5,
    name: 'party_config',
    sql: [
      `CREATE TABLE IF NOT EXISTS party_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        party_level INTEGER NOT NULL DEFAULT 1,
        party_size  INTEGER NOT NULL DEFAULT 4,
        pwol        INTEGER NOT NULL DEFAULT 0
      )`,
      `INSERT OR IGNORE INTO party_config (id, party_level, party_size, pwol)
        VALUES (1, 1, 4, 0)`,
    ],
  },
];

export async function runMigrations(
  onStatus?: (message: string) => void
): Promise<void> {
  const sqlite = await Database.load('sqlite:pf2e.db');

  // Create _migrations tracking table if not exists
  await sqlite.execute(
    `CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )`,
    []
  );

  // Get already-applied migration versions
  const applied = await sqlite.select<{ version: number }[]>(
    'SELECT version FROM _migrations ORDER BY version',
    []
  );
  const appliedVersions = new Set(applied.map((r) => r.version));

  // Run only unapplied migrations in order
  for (const migration of MIGRATIONS) {
    if (appliedVersions.has(migration.version)) continue;

    onStatus?.(`Running migration ${migration.version}: ${migration.name}...`);

    for (const sql of migration.sql) {
      await sqlite.execute(sql, []);
    }

    // Record migration as applied
    await sqlite.execute(
      'INSERT INTO _migrations (version, name, applied_at) VALUES ($1, $2, $3)',
      [migration.version, migration.name, new Date().toISOString()]
    );
  }
}
