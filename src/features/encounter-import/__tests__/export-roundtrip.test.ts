// 69-06: round-trip integration test. Builds an in-memory sql.js database
// matching the production schema excerpt touched by the export/import path,
// seeds bestiary + hazard + custom creature rows, persists a sample encounter,
// then exports → re-imports and asserts combatant parity.
//
// The test mocks `@/shared/db` → an async wrapper around sql.js that exposes
// the same `{ select, execute }` surface as @tauri-apps/plugin-sql's Database.
// All DB-touching helpers (listEncounters, loadEncounterCombatants,
// createEncounter, saveEncounterCombatants, matchEncounter, exportEncounter)
// go through getDb, so one mock suffices for the whole pipeline.

import { describe, it, expect, beforeAll, vi } from 'vitest'
import initSqlJs from 'sql.js'
import type { Database as SqlJsDatabase } from 'sql.js'
import fs from 'node:fs'
import path from 'node:path'

// ── sql.js-backed fake satisfying the Tauri plugin-sql Database surface ─────
// Production code uses positional `?` placeholders (sqlite mode); sql.js also
// speaks `?`, so no placeholder rewriting is needed.

interface FakeDb {
  select<T>(query: string, bindValues?: unknown[]): Promise<T>
  execute(
    query: string,
    bindValues?: unknown[],
  ): Promise<{ rowsAffected: number; lastInsertId?: number }>
}

let sqlDb: SqlJsDatabase | null = null

function makeFakeDb(db: SqlJsDatabase): FakeDb {
  return {
    async select<T>(query: string, bindValues: unknown[] = []): Promise<T> {
      const stmt = db.prepare(query)
      stmt.bind(bindValues as (string | number | null)[])
      const out: Record<string, unknown>[] = []
      while (stmt.step()) {
        out.push(stmt.getAsObject() as Record<string, unknown>)
      }
      stmt.free()
      return out as T
    },
    async execute(query: string, bindValues: unknown[] = []) {
      const stmt = db.prepare(query)
      stmt.bind(bindValues as (string | number | null)[])
      stmt.step()
      const rowsAffected = db.getRowsModified()
      stmt.free()
      return { rowsAffected }
    },
  }
}

vi.mock('@/shared/db', () => ({
  getDb: async () => {
    if (!sqlDb) throw new Error('sql.js DB not initialised — check beforeAll')
    return makeFakeDb(sqlDb)
  },
}))

// ── Schema excerpt — only what the export / import pipeline touches ─────────
vi.mock('@/shared/api', () => ({
  listEncounters: async () => {
    if (!sqlDb) throw new Error('sql.js DB not initialised')
    const rows = await makeFakeDb(sqlDb).select<Array<{
      id: string; name: string; party_level: number; party_size: number;
      round: number; turn: number; active_combatant_id: string | null;
      is_running: number; created_at: string
    }>>(
      `SELECT id, name, party_level, party_size, round, turn, active_combatant_id, is_running, created_at
       FROM encounters ORDER BY created_at DESC`,
      [],
    )
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      partyLevel: r.party_level,
      partySize: r.party_size,
      round: r.round,
      turn: r.turn,
      activeCombatantId: r.active_combatant_id,
      isRunning: r.is_running === 1,
      createdAt: r.created_at,
    }))
  },
  loadEncounterCombatants: async (encounterId: string) => {
    if (!sqlDb) throw new Error('sql.js DB not initialised')
    const rows = await makeFakeDb(sqlDb).select<Array<{
      id: string; encounter_id: string; creature_ref: string | null; display_name: string;
      initiative: number; hp: number; max_hp: number; temp_hp: number; is_npc: number;
      weak_elite_tier: string; creature_level: number; sort_order: number;
      is_hazard: number; hazard_ref: string | null; hazard_type: string | null;
      perception: number | null
    }>>(
      `SELECT ec.id, ec.encounter_id, ec.creature_ref, ec.display_name, ec.initiative,
              ec.hp, ec.max_hp, ec.temp_hp, ec.is_npc, ec.weak_elite_tier, ec.creature_level,
              ec.sort_order, ec.is_hazard, ec.hazard_ref, ec.perception, h.hazard_type
       FROM encounter_combatants ec
       LEFT JOIN hazards h ON ec.hazard_ref = h.id
       WHERE ec.encounter_id = ?
       ORDER BY ec.sort_order`,
      [encounterId],
    )
    return rows.map((r) => ({
      id: r.id,
      encounterId: r.encounter_id,
      creatureRef: r.creature_ref ?? '',
      displayName: r.display_name,
      initiative: r.initiative,
      hp: r.hp,
      maxHp: r.max_hp,
      tempHp: r.temp_hp,
      isNPC: r.is_npc === 1,
      weakEliteTier: r.weak_elite_tier,
      creatureLevel: r.creature_level,
      sortOrder: r.sort_order,
      isHazard: r.is_hazard === 1,
      hazardRef: r.hazard_ref,
      hazardType: r.hazard_type ?? undefined,
      perception: r.perception ?? undefined,
    }))
  },
  createEncounter: async (id: string, name: string, partyLevel: number, partySize: number) => {
    if (!sqlDb) throw new Error('sql.js DB not initialised')
    await makeFakeDb(sqlDb).execute(
      `INSERT OR IGNORE INTO encounters (id, name, party_level, party_size) VALUES (?, ?, ?, ?)`,
      [id, name, partyLevel, partySize],
    )
  },
  saveEncounterCombatants: async (encounterId: string, combatants: Array<Record<string, unknown>>) => {
    if (!sqlDb) throw new Error('sql.js DB not initialised')
    const db = makeFakeDb(sqlDb)
    await db.execute(`DELETE FROM encounter_combatants WHERE encounter_id = ?`, [encounterId])
    for (let i = 0; i < combatants.length; i += 1) {
      const c = combatants[i]
      await db.execute(
        `INSERT INTO encounter_combatants
          (id, encounter_id, creature_ref, display_name, initiative, hp, max_hp, temp_hp,
           is_npc, weak_elite_tier, creature_level, sort_order, is_hazard, hazard_ref, perception)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          c.id, encounterId, c.creatureRef ?? null, c.displayName, c.initiative,
          c.hp, c.maxHp, c.tempHp, c.isNPC ? 1 : 0, c.weakEliteTier ?? 'normal',
          c.creatureLevel ?? 0, i, c.isHazard ? 1 : 0, c.hazardRef ?? null, null,
        ],
      )
    }
  },
  getCustomCreatureById: async (id: string) => {
    if (!sqlDb) throw new Error('sql.js DB not initialised')
    const rows = await makeFakeDb(sqlDb).select<Array<{
      id: string; name: string; level: number; rarity: string; source_type: string;
      created_at: string; updated_at: string; data_json: string
    }>>(
      `SELECT id, name, level, rarity, source_type, created_at, updated_at, data_json
       FROM custom_creatures WHERE id = ?`,
      [id],
    )
    const row = rows[0]
    if (!row) return null
    return {
      id: row.id,
      name: row.name,
      level: row.level,
      rarity: row.rarity,
      source_type: row.source_type,
      created_at: row.created_at,
      updated_at: row.updated_at,
      statBlock: { ...JSON.parse(row.data_json), id: row.id },
    }
  },
  createImportedCustomCreature: async (data: { name: string; level: number; rarity: string }) => {
    if (!sqlDb) throw new Error('sql.js DB not initialised')
    const db = makeFakeDb(sqlDb)
    const baseName = data.name
    const date = new Date().toISOString().slice(0, 10)
    const existing = await db.select<Array<{ name: string }>>(
      `SELECT name FROM custom_creatures WHERE name = ? OR name LIKE ?`,
      [baseName, `${baseName} Copy% - ${date}`],
    )
    const taken = new Set(existing.map((r) => r.name))
    let name = baseName
    if (taken.has(name)) name = `${baseName} Copy - ${date}`
    let n = 2
    while (taken.has(name)) {
      name = `${baseName} Copy ${n} - ${date}`
      n += 1
    }
    const id = `custom-${crypto.randomUUID()}`
    await db.execute(
      `INSERT INTO custom_creatures (id, name, level, rarity, source_type, data_json)
       VALUES (?, ?, ?, ?, 'foundry_clone', ?)`,
      [id, name, data.level, data.rarity, JSON.stringify({ ...data, id, name })],
    )
    return { id, name }
  },
}))

const SCHEMA = `
CREATE TABLE entities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  level INTEGER,
  hp INTEGER
);
CREATE TABLE custom_creatures (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 0,
  rarity TEXT NOT NULL DEFAULT 'common',
  source_type TEXT NOT NULL DEFAULT 'scratch',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  data_json TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE hazards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 0,
  hp INTEGER,
  hazard_type TEXT NOT NULL DEFAULT 'simple'
);
CREATE TABLE encounters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  party_level INTEGER NOT NULL DEFAULT 1,
  party_size INTEGER NOT NULL DEFAULT 4,
  round INTEGER NOT NULL DEFAULT 0,
  turn INTEGER NOT NULL DEFAULT 0,
  active_combatant_id TEXT,
  is_running INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE encounter_combatants (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL,
  creature_ref TEXT,
  display_name TEXT NOT NULL,
  initiative REAL NOT NULL DEFAULT 0,
  hp INTEGER NOT NULL DEFAULT 0,
  max_hp INTEGER NOT NULL DEFAULT 0,
  temp_hp INTEGER NOT NULL DEFAULT 0,
  is_npc INTEGER NOT NULL DEFAULT 1,
  weak_elite_tier TEXT NOT NULL DEFAULT 'normal',
  creature_level INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_hazard INTEGER NOT NULL DEFAULT 0,
  hazard_ref TEXT,
  perception INTEGER
);
`

async function loadSqlJs(): Promise<SqlJsDatabase> {
  const SQL = await initSqlJs({
    locateFile: (file) => path.resolve('node_modules/sql.js/dist', file),
    wasmBinary: fs.readFileSync(
      path.resolve('node_modules/sql.js/dist/sql-wasm.wasm'),
    ),
  })
  return new SQL.Database()
}

// ── Test body ────────────────────────────────────────────────────────────────

describe('encounter export → import round-trip', () => {
  const SRC_ENCOUNTER_ID = 'enc-src'

  beforeAll(async () => {
    sqlDb = await loadSqlJs()
    sqlDb.exec(SCHEMA)

    // Bestiary row — matched by `lookupName = 'Goblin Warrior'`.
    sqlDb.exec(`
      INSERT INTO entities (id, name, type, level, hp) VALUES
        ('goblin-bestiary-1', 'Goblin Warrior', 'npc', -1, 6);
    `)

    // Custom creature — matched by `lookupName = 'Abobus'`.
    sqlDb.exec(`
      INSERT INTO custom_creatures (id, name, level, rarity, source_type, data_json) VALUES
        ('abobus-custom-1', 'Abobus', 10, 'common', 'scratch',
          '{"name":"Abobus","level":10,"hp":200,"ac":30,"fort":20,"ref":18,"will":16,"perception":19,"stealth":null,"rarity":"common","size":"Medium","type":"npc","traits":[],"speeds":{"land":25},"strikes":[],"abilities":[],"skills":[],"languages":[],"senses":[],"source":"custom"}');
    `)

    // Hazard row.
    sqlDb.exec(`
      INSERT INTO hazards (id, name, level, hp) VALUES
        ('pit-hazard-1', 'Spiked Pit', 3, 30);
    `)

    // Source encounter — created directly so we exercise the read path.
    sqlDb.exec(`
      INSERT INTO encounters (id, name, party_level, party_size, round, turn, is_running)
      VALUES ('enc-src', 'Братья дварфы', 4, 4, 0, 0, 0);
    `)

    // Three combatants — one bestiary NPC with a local moniker, one custom
    // creature (no name override), one hazard.
    sqlDb.exec(`
      INSERT INTO encounter_combatants
        (id, encounter_id, creature_ref, display_name, initiative, hp, max_hp, temp_hp,
         is_npc, weak_elite_tier, creature_level, sort_order, is_hazard, hazard_ref)
      VALUES
        ('cb-gob',    'enc-src', 'goblin-bestiary-1', 'Огрек',      18, 5,  6,  0, 1, 'elite',  0, 0, 0, NULL),
        ('cb-custom', 'enc-src', 'abobus-custom-1',   'Abobus',     12, 180, 200, 0, 1, 'normal', 10, 1, 0, NULL),
        ('cb-hazard', 'enc-src', '',                  'Spiked Pit',  0, 30, 30, 0, 0, 'normal',  3, 2, 1, 'pit-hazard-1');
    `)
  })

  it('round-trips combatants through exportEncounter → parseEncounterJson → matchEncounter → commitMatchedEncounter', async () => {
    // Dynamic imports AFTER the vi.mock call above so the mock binds.
    const { exportEncounter } = await import('../lib/export-encounter')
    const { parseEncounterJson } = await import('../lib/parse-formats')
    const { matchEncounter } = await import('../lib/match-combatants')
    const { commitMatchedEncounter } = await import('../lib/import-encounter')
    const { loadEncounterCombatants } = await import('@/shared/api')

    // 1. Export
    const { filename, content } = await exportEncounter(SRC_ENCOUNTER_ID)
    expect(filename).toBe('Братья-дварфы.pathmaid')
    const payload = JSON.parse(content)
    expect(payload.version).toBe('pathmaiden-v1')
    expect(payload.encounter.combatants).toHaveLength(3)
    expect(payload.encounter.customCreatures).toHaveLength(1)

    // Spot-check the canonical lookup names landed in the export.
    const exported = payload.encounter.combatants as Array<{
      name: string
      lookupName: string
      weakEliteTier: string
      hp: number
      hpMax: number
      initiative: number
    }>
    const ogrek = exported.find((c) => c.name === 'Огрек')!
    expect(ogrek.lookupName).toBe('Goblin Warrior')
    expect(ogrek.weakEliteTier).toBe('elite')
    expect(ogrek.hp).toBe(5)
    expect(ogrek.hpMax).toBe(6)
    expect(ogrek.initiative).toBe(18)

    // 2. Re-parse
    const parsed = parseEncounterJson(JSON.parse(content))
    expect(parsed).toHaveLength(1)

    // 3. Match
    const matched = await matchEncounter(parsed[0])
    expect(matched.combatants).toHaveLength(3)
    const statuses = matched.combatants.map((c) => c.match.status).sort()
    expect(statuses).toEqual(['bestiary', 'custom', 'hazard'])

    // 4. Commit (name collides — deriveUniqueName appends "(imported)").
    const result = await commitMatchedEncounter(matched, 4, 4)
    expect(result.importedCount).toBe(3)
    expect(result.skippedCount).toBe(0)
    expect(result.name).not.toBe('Братья дварфы') // collision renamed

    // 5. Load newly committed combatants and assert parity with source.
    const reloaded = await loadEncounterCombatants(result.encounterId)
    expect(reloaded).toHaveLength(3)

    const byDisplay = new Map(reloaded.map((c) => [c.displayName, c]))
    const srcOgrek = byDisplay.get('Огрек')!
    expect(srcOgrek.creatureRef).toBe('goblin-bestiary-1')
    expect(srcOgrek.hp).toBe(5)
    expect(srcOgrek.maxHp).toBe(6)
    expect(srcOgrek.initiative).toBe(18)
    expect(srcOgrek.weakEliteTier).toBe('elite')

    const srcAbobus = byDisplay.get('Abobus')!
    expect(srcAbobus.creatureRef).not.toBe('abobus-custom-1')
    expect(srcAbobus.initiative).toBe(12)

    const srcHazard = byDisplay.get('Spiked Pit')!
    expect(srcHazard.isHazard).toBe(true)
    expect(srcHazard.hazardRef).toBe('pit-hazard-1')
    expect(srcHazard.hp).toBe(30)
  })
})
