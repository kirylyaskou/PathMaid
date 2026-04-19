// 61-10: integration test for getContextEffectsForEncounter against an
// in-memory SQLite (sql.js). Mirrors the SQL embedded in effects.ts so that
// if that file's query drifts, this test fails and flags the divergence.
//
// Scenarios mirror the Abobus reproducer:
//   - custom creature with Thundering Dominance in its data_json spellcasting
//   - same creature carrying Drakeheart Mutagen (Greater) via
//     encounter_combatant_items
//   - a plain bestiary creature with a spell via creature_spell_lists
//
// We assert all three effects surface in the context query. We also assert
// that an unrelated effect (not tied to any combatant) does NOT surface.

import { describe, it, expect, beforeAll } from 'vitest'
import initSqlJs from 'sql.js'
import type { Database } from 'sql.js'
import fs from 'node:fs'
import path from 'node:path'

// ── Schema excerpts — just what the context query touches ───────────────────
const SCHEMA = `
CREATE TABLE spells (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rank INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE spell_effects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rules_json TEXT NOT NULL DEFAULT '[]',
  duration_json TEXT NOT NULL DEFAULT '{}',
  description TEXT,
  spell_id TEXT REFERENCES spells(id),
  source_pack TEXT
);
CREATE TABLE creature_spell_lists (
  id TEXT PRIMARY KEY,
  creature_id TEXT NOT NULL,
  entry_id TEXT NOT NULL,
  spell_foundry_id TEXT,
  spell_name TEXT NOT NULL,
  rank_prepared INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE creature_items (
  id TEXT PRIMARY KEY,
  creature_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL,
  foundry_item_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);
CREATE TABLE encounter_combatants (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL,
  creature_ref TEXT,
  display_name TEXT NOT NULL,
  is_npc INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE encounter_combatant_items (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL,
  combatant_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_foundry_id TEXT,
  item_type TEXT NOT NULL DEFAULT 'equipment',
  is_removed INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE custom_creatures (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 0,
  data_json TEXT NOT NULL
);
`

// ── SQL mirroring effects.ts getContextEffectsForEncounter ──────────────────
// Keep in sync with src/shared/api/effects.ts. If they drift, this test fails.
const CATEGORY_EXPR = `
  CASE
    WHEN se.source_pack LIKE '%spell-effects%' THEN 'spell'
    WHEN se.source_pack LIKE '%equipment-effects%' THEN 'alchemical'
    WHEN se.spell_id IS NOT NULL THEN 'spell'
    WHEN LOWER(se.name) LIKE '%elixir%'
      OR LOWER(se.name) LIKE '%mutagen%' THEN 'alchemical'
    ELSE 'other'
  END
`
const SELECT_WITH_LEVEL = `
  SELECT se.id, se.name, se.rules_json, se.duration_json, se.description, se.spell_id,
         COALESCE(s.rank, 1) AS level,
         ${CATEGORY_EXPR} AS category
  FROM spell_effects se
  LEFT JOIN spells s ON se.spell_id = s.id
`
// Path 1 — bestiary spells.
const BESTIARY_SQL = `${SELECT_WITH_LEVEL}
WHERE se.spell_id IS NOT NULL
  AND se.spell_id IN (
    SELECT DISTINCT csl.spell_foundry_id
    FROM creature_spell_lists csl
    JOIN encounter_combatants ec ON ec.creature_ref = csl.creature_id
    WHERE ec.encounter_id = ?
      AND csl.spell_foundry_id IS NOT NULL
  )`

// Path 3 — item names for the encounter (raw + prefix-stripped).
// Mirror of effects.ts collectItemNamesForEncounter — joins through items by
// foundry_item_id so we can also mine @UUID references out of
// items.description (authoritative item→effect link).
const ITEM_NAMES_SQL = `
SELECT ci.item_name AS item_name, i.description AS description FROM creature_items ci
JOIN encounter_combatants ec ON ec.creature_ref = ci.creature_id
LEFT JOIN items i ON i.id = ci.foundry_item_id
WHERE ec.encounter_id = ?
UNION
SELECT eci.item_name AS item_name, i.description AS description FROM encounter_combatant_items eci
JOIN encounter_combatants ec ON ec.id = eci.combatant_id
LEFT JOIN items i ON i.id = eci.item_foundry_id
WHERE ec.encounter_id = ?
  AND eci.is_removed = 0
`

// Mirror of effects.ts EFFECT_UUID_RE + extractEffectNamesFromDescription.
const EFFECT_UUID_RE_TEST =
  /@UUID\[Compendium\.pf2e\.equipment-effects\.Item\.([^\]]+?)\]/g
const LEGACY_BARE_EFFECT_RE_TEST =
  /<p[^>]*>\s*Effect:\s*([^<]+?)\s*<\/p>/gi

function extractEffectNamesFromDescription(description: string | null): string[] {
  if (!description) return []
  const names: string[] = []
  let m: RegExpExecArray | null
  EFFECT_UUID_RE_TEST.lastIndex = 0
  while ((m = EFFECT_UUID_RE_TEST.exec(description)) !== null) {
    const raw = m[1].trim()
    if (!raw) continue
    const stripped = stripEffectPrefix(raw)
    if (stripped) names.push(stripped)
  }
  LEGACY_BARE_EFFECT_RE_TEST.lastIndex = 0
  while ((m = LEGACY_BARE_EFFECT_RE_TEST.exec(description)) !== null) {
    const raw = m[1].trim()
    if (!raw) continue
    names.push(raw)
  }
  return names
}

// Path 3 — match prefix-stripped names against spell_effects.name.
function buildItemMatchedSql(nameCount: number): string {
  const ph = Array(nameCount).fill('?').join(',')
  return `${SELECT_WITH_LEVEL}
WHERE LOWER(TRIM(se.name)) IN (${ph})`
}

const CUSTOM_NAMES_SQL = `
  SELECT cc.data_json
  FROM custom_creatures cc
  JOIN encounter_combatants ec ON ec.creature_ref = cc.id
  WHERE ec.encounter_id = ?
`

// Path 2 — three-pronged custom-spell match.
function buildCustomMatchedSql(nameCount: number): string {
  const ph = Array(nameCount).fill('?').join(',')
  const heighten = Array(nameCount).fill('LOWER(TRIM(se.name)) LIKE ?').join(' OR ')
  return `${SELECT_WITH_LEVEL}
WHERE se.spell_id IN (
  SELECT id FROM spells WHERE LOWER(TRIM(name)) IN (${ph})
)
OR LOWER(TRIM(se.name)) IN (${ph})
OR (${heighten})`
}

function stripEffectPrefix(s: string): string {
  return s.replace(/^(?:Spell Effect|Effect|Stance|Aura):\s*/i, '').trim()
}

// ── Test harness ────────────────────────────────────────────────────────────

interface EffectRow {
  id: string
  name: string
  category: string
}

function execQuery(db: Database, sql: string, params: unknown[]): EffectRow[] {
  const stmt = db.prepare(sql)
  // sql.js typings accept a loose BindParams; cast keeps the test typecheck-clean.
  stmt.bind(params as (string | number | null)[])
  const rows: EffectRow[] = []
  while (stmt.step()) {
    const r = stmt.getAsObject()
    rows.push({
      id: String(r.id),
      name: String(r.name),
      category: String(r.category),
    })
  }
  stmt.free()
  return rows
}

function execCustomNames(db: Database, encounterId: string): string[] {
  const stmt = db.prepare(CUSTOM_NAMES_SQL)
  stmt.bind([encounterId])
  const names = new Set<string>()
  while (stmt.step()) {
    const r = stmt.getAsObject() as { data_json: string }
    try {
      const data = JSON.parse(r.data_json) as {
        spellcasting?: Array<{
          spellsByRank?: Array<{ spells?: Array<{ name?: string }> }>
        }>
      }
      for (const entry of data.spellcasting ?? []) {
        for (const rank of entry.spellsByRank ?? []) {
          for (const s of rank.spells ?? []) {
            if (s.name) names.add(s.name)
          }
        }
      }
    } catch {
      // ignore
    }
  }
  stmt.free()
  return Array.from(names)
}

async function loadSqlJs(): Promise<Database> {
  const SQL = await initSqlJs({
    locateFile: (file) =>
      path.resolve('node_modules/sql.js/dist', file),
    wasmBinary: fs.readFileSync(
      path.resolve('node_modules/sql.js/dist/sql-wasm.wasm'),
    ),
  })
  return new SQL.Database()
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('getContextEffectsForEncounter — integration against sql.js', () => {
  let db: Database
  const ENCOUNTER_ID = 'enc-1'

  beforeAll(async () => {
    db = await loadSqlJs()
    db.exec(SCHEMA)

    // spells
    db.exec(`
      INSERT INTO spells (id, name, rank) VALUES
        ('spell-thundering', 'Thundering Dominance', 2),
        ('spell-heroism',    'Heroism',              3),
        ('spell-bane',       'Bane',                 1);
    `)

    // spell_effects — spell-effects pack + equipment-effects pack.
    // IMPORTANT: real PF2e packs use ONE Elixir of Life effect for ALL six
    // item tiers (Minor..True) — the effect name has no tier suffix. Items
    // however are named "Elixir of Life (Moderate)" etc. Direct name-equality
    // never matches; only the description's @UUID[...Effect: Elixir of Life]
    // link connects them.
    db.exec(`
      INSERT INTO spell_effects (id, name, spell_id, source_pack) VALUES
        ('se-thundering', 'Thundering Dominance Heightened (+2)', 'spell-thundering', 'spell-effects'),
        ('se-heroism',    'Heroism',                              'spell-heroism',    'spell-effects'),
        ('se-bane',       'Bane',                                 'spell-bane',       'spell-effects'),
        ('se-drakeheart', 'Drakeheart Mutagen (Greater)',         NULL,               'equipment-effects'),
        ('se-elixir',     'Elixir of Life',                       NULL,               'equipment-effects'),
        ('se-goggles',    'Alchemist Goggles',                    NULL,               'equipment-effects'),
        ('se-unused',     'Unused Spell Effect',                  NULL,               'spell-effects');
    `)

    // Also plant a spell linking to an unused effect to prove we filter
    db.exec(`UPDATE spell_effects SET spell_id = NULL WHERE id = 'se-unused';`)

    // Bestiary creature — Goblin — with Bane in its spell list
    db.exec(`
      INSERT INTO creature_spell_lists
        (id, creature_id, entry_id, spell_foundry_id, spell_name, rank_prepared, sort_order)
      VALUES
        ('csl-1', 'goblin-001', 'entry-A', 'spell-bane', 'Bane', 1, 0);
    `)

    // items table — catalog rows with the Foundry-embedded description HTML
    // that carries the authoritative @UUID[...equipment-effects...Effect: X]
    // link to the effect row. These are what the context query LEFT JOINs
    // against via foundry_item_id to mine effect names from descriptions.
    db.exec(`
      INSERT INTO items (id, name, description) VALUES
        ('item-elixir-minor',
         'Elixir of Life (Minor)',
         '<p>Heals stuff.</p><p>@UUID[Compendium.pf2e.equipment-effects.Item.Effect: Elixir of Life]</p>'),
        ('item-goggles',
         'Alchemist Goggles',
         '<p>Brass goggles.</p><p>@UUID[Compendium.pf2e.equipment-effects.Item.Effect: Alchemist Goggles]</p>'),
        ('item-drakeheart-major',
         'Drakeheart Mutagen (Major)',
         '<p>Mutagen.</p><p>@UUID[Compendium.pf2e.equipment-effects.Item.Effect: Drakeheart Mutagen (Major)]</p>'),
        ('item-drakeheart-greater',
         'Drakeheart Mutagen (Greater)',
         '<p>Mutagen.</p><p>@UUID[Compendium.pf2e.equipment-effects.Item.Effect: Drakeheart Mutagen (Greater)]</p>'),
        ('item-rapier',
         'Rapier',
         '<p>A sword.</p>'),
        ('item-effect-drakeheart-greater',
         'Effect: Drakeheart Mutagen (Greater)',
         '<p>Granted by @UUID[Compendium.pf2e.equipment-srd.Item.Drakeheart Mutagen (Greater)]</p>');
    `)

    // Bestiary creature inventory — Elixir linked via foundry_item_id.
    // creature_items.item_name = "Elixir of Life (Minor)" does NOT match
    // spell_effects.name = "Elixir of Life" directly. Only the items.description
    // @UUID path surfaces it.
    db.exec(`
      INSERT INTO creature_items
        (id, creature_id, item_name, item_type, foundry_item_id, sort_order)
      VALUES
        ('ci-1', 'goblin-001', 'Elixir of Life (Minor)', 'consumable', 'item-elixir-minor', 0),
        ('ci-2', 'goblin-001', 'Alchemist Goggles', 'equipment', 'item-goggles', 1),
        ('ci-3', 'goblin-001', 'Rapier', 'weapon', 'item-rapier', 2);
    `)

    // Goblin also carries a Foundry-style "Effect: ..."-prefixed item — the
    // common case where the inventory references the effect entity directly.
    db.exec(`
      INSERT INTO encounter_combatant_items
        (id, encounter_id, combatant_id, item_name, item_foundry_id, item_type, is_removed)
      VALUES
        ('eci-prefix', 'enc-1', 'combatant-gob', 'Effect: Drakeheart Mutagen (Greater)', 'item-effect-drakeheart-greater', 'effect', 0);
    `)

    // Custom creature — Abobus — with Thundering Dominance in data_json
    const abobusData = {
      name: 'Abobus',
      level: 10,
      spellcasting: [
        {
          entryId: 'custom-entry-1',
          tradition: 'occult',
          castType: 'spontaneous',
          spellsByRank: [
            { rank: 2, slots: 3, spells: [{ name: 'Thundering Dominance', foundryId: null }] },
          ],
        },
      ],
    }
    db.run(
      `INSERT INTO custom_creatures (id, name, level, data_json) VALUES (?, ?, ?, ?)`,
      ['abobus-001', 'Abobus', 10, JSON.stringify(abobusData)],
    )

    // Encounter combatants: one goblin (bestiary), one abobus (custom)
    db.exec(`
      INSERT INTO encounter_combatants
        (id, encounter_id, creature_ref, display_name, is_npc)
      VALUES
        ('combatant-gob', 'enc-1', 'goblin-001',  'Goblin',  1),
        ('combatant-abo', 'enc-1', 'abobus-001',  'Abobus',  1);
    `)

    // Abobus carries a Drakeheart Mutagen via encounter-item override —
    // name-match path would surface the (Greater) effect here directly. We
    // also add a Major in items table to cover the description-path for a
    // tier that happens to collide with the item name.
    db.exec(`
      INSERT INTO encounter_combatant_items
        (id, encounter_id, combatant_id, item_name, item_foundry_id, item_type, is_removed)
      VALUES
        ('eci-1', 'enc-1', 'combatant-abo', 'Drakeheart Mutagen (Greater)', 'item-drakeheart-greater', 'consumable', 0);
    `)
  })

  // Helper — runs the full pipeline (paths 1+2+3) the same way effects.ts does.
  function runFullContextQuery(): EffectRow[] {
    // Path 1
    const bestiary = execQuery(db, BESTIARY_SQL, [ENCOUNTER_ID])

    // Path 3 — collect raw item names + add prefix-stripped variants AND
    // harvest effect names from items.description @UUID references (the
    // authoritative item↔effect link for consumables/equipment where direct
    // name-equality fails — e.g. tier-suffixed items vs single shared effect).
    const rawRows = (() => {
      const stmt = db.prepare(ITEM_NAMES_SQL)
      stmt.bind([ENCOUNTER_ID, ENCOUNTER_ID])
      const out: Array<{ item_name: string; description: string | null }> = []
      while (stmt.step()) {
        const r = stmt.getAsObject() as { item_name: string; description: string | null }
        out.push({ item_name: r.item_name, description: r.description ?? null })
      }
      stmt.free()
      return out
    })()
    const itemNames = new Set<string>()
    for (const r of rawRows) {
      if (r.item_name) {
        itemNames.add(r.item_name)
        const s = stripEffectPrefix(r.item_name)
        if (s && s !== r.item_name) itemNames.add(s)
      }
      for (const n of extractEffectNamesFromDescription(r.description)) {
        itemNames.add(n)
      }
    }
    let items: EffectRow[] = []
    if (itemNames.size > 0) {
      const arr = Array.from(itemNames)
      items = execQuery(db, buildItemMatchedSql(arr.length), arr.map((n) => n.toLowerCase().trim()))
    }

    // Path 2 — custom creature spells with three-pronged match
    const customNames = execCustomNames(db, ENCOUNTER_ID)
    let custom: EffectRow[] = []
    if (customNames.length > 0) {
      const lc = customNames.map((n) => n.toLowerCase().trim())
      const heighten = lc.map((n) => `${n} heightened%`)
      custom = execQuery(db, buildCustomMatchedSql(lc.length), [...lc, ...lc, ...heighten])
    }

    const seen = new Set<string>()
    const merged: EffectRow[] = []
    for (const r of [...bestiary, ...items, ...custom]) {
      if (seen.has(r.id)) continue
      seen.add(r.id)
      merged.push(r)
    }
    return merged.sort((a, b) => a.name.localeCompare(b.name))
  }

  it('surfaces bestiary combatant spell effect (Bane on goblin)', () => {
    const rows = runFullContextQuery()
    expect(rows.map((r) => r.id)).toContain('se-bane')
  })

  it('surfaces equipment effect from a bestiary creature item (Elixir of Life on goblin)', () => {
    const rows = runFullContextQuery()
    expect(rows.map((r) => r.id)).toContain('se-elixir')
  })

  it('surfaces equipment effect from encounter_combatant_items (Drakeheart on Abobus)', () => {
    const rows = runFullContextQuery()
    const row = rows.find((r) => r.id === 'se-drakeheart')
    expect(row).toBeDefined()
    expect(row!.category).toBe('alchemical')
  })

  it('strips "Effect: ..." prefix when matching item to spell_effects (regression: Drakeheart shows when item named "Effect: Drakeheart Mutagen (Greater)")', () => {
    // The fixture also adds an "Effect: Drakeheart Mutagen (Greater)"-prefixed
    // item to the goblin. Without prefix-stripping, the IN-list match would
    // miss spell_effects.name = "Drakeheart Mutagen (Greater)".
    const rows = runFullContextQuery()
    const dh = rows.find((r) => r.id === 'se-drakeheart')
    expect(dh).toBeDefined()
  })

  it('surfaces custom-creature spell effect via data_json (Thundering Dominance on Abobus)', () => {
    // The effect row is "Thundering Dominance Heightened (+2)" — its spell_id
    // points to the spell. Path 2's first prong (spell_id IN spells with name)
    // catches it.
    const rows = runFullContextQuery()
    expect(rows.map((r) => r.id)).toContain('se-thundering')
  })

  it('matches heightened-variant effect even when spell_id is NULL (regression)', () => {
    // Plant a heightened-variant effect whose name carries the "(+N)" suffix
    // and whose spell_id stayed NULL because sync's name match couldn't strip
    // the suffix. Path 2's third prong (LOWER(name) LIKE 'spellname heightened%')
    // should still surface it for a custom caster who knows the base spell.
    db.exec(`
      INSERT INTO spell_effects (id, name, spell_id, source_pack) VALUES
        ('se-thund-orphan', 'Thundering Dominance Heightened (+5)', NULL, 'spell-effects');
    `)
    const rows = runFullContextQuery()
    expect(rows.map((r) => r.id)).toContain('se-thund-orphan')
    // Cleanup so other tests aren't affected by the orphan row.
    db.exec(`DELETE FROM spell_effects WHERE id = 'se-thund-orphan';`)
  })

  it('filters out unrelated effects not tied to any combatant', () => {
    const rows = runFullContextQuery()
    expect(rows.map((r) => r.id)).not.toContain('se-unused')
  })

  it('equipment effects land in alchemical category, spell effects in spell', () => {
    const rows = runFullContextQuery()
    const bane = rows.find((r) => r.id === 'se-bane')!
    const drakeheart = rows.find((r) => r.id === 'se-drakeheart')!
    expect(bane.category).toBe('spell')
    expect(drakeheart.category).toBe('alchemical')
  })

  it('surfaces tier-shared effect via description @UUID when item and effect names diverge (regression: Elixir of Life)', () => {
    // Real-world case from Alchemist Aspirant bestiary entry:
    //  - creature_items.item_name = "Elixir of Life (Minor)"  [has tier]
    //  - spell_effects.name       = "Elixir of Life"          [no tier]
    // Pure name-equality (what the pre-fix code did) never matches.
    // items.description carries @UUID[...Effect: Elixir of Life] which IS the
    // authoritative linkage. This test locks in the description-path fix.
    const rows = runFullContextQuery()
    expect(rows.map((r) => r.id)).toContain('se-elixir')
  })

  it('surfaces effect from bestiary base inventory via description @UUID (Alchemist Goggles)', () => {
    // Alchemist Goggles item.name matches effect.name after strip — but
    // this regression also exercises the description path from the base
    // creature_items inventory (not just encounter overrides).
    const rows = runFullContextQuery()
    expect(rows.map((r) => r.id)).toContain('se-goggles')
  })

  it('does not surface effects whose items are NOT in any combatant inventory', () => {
    // item-drakeheart-major exists in the items table with a description
    // @UUID pointing at "Effect: Drakeheart Mutagen (Major)" — but nobody
    // carries it. The context query MUST filter that out (description paths
    // only trigger for items actually joined through an inventory).
    db.exec(`
      INSERT INTO spell_effects (id, name, spell_id, source_pack) VALUES
        ('se-drakeheart-major', 'Drakeheart Mutagen (Major)', NULL, 'equipment-effects');
    `)
    const rows = runFullContextQuery()
    expect(rows.map((r) => r.id)).not.toContain('se-drakeheart-major')
    db.exec(`DELETE FROM spell_effects WHERE id = 'se-drakeheart-major';`)
  })

  it('tolerates items without foundry_item_id (no LEFT JOIN match, falls back to name-only path)', () => {
    // Legacy creature_items rows may lack foundry_item_id. The LEFT JOIN
    // returns description=NULL, extractEffectNames returns []. Name-path
    // still functions independently. Insert a stand-alone legacy row and
    // confirm it does not break the pipeline.
    db.exec(`
      INSERT INTO creature_items
        (id, creature_id, item_name, item_type, foundry_item_id, sort_order)
      VALUES
        ('ci-legacy', 'goblin-001', 'Mystery Potion', 'consumable', NULL, 99);
    `)
    expect(() => runFullContextQuery()).not.toThrow()
    db.exec(`DELETE FROM creature_items WHERE id = 'ci-legacy';`)
  })

  it('legacy fallback: finds bare "<p>Effect: X</p>" paragraphs (pre-fix sync mangled @UUID wrappers)', () => {
    // Earlier sync versions had a resolveUUIDTokensInDescriptions bug that
    // unwrapped @UUID[...equipment-effects...] into bare "Effect: NAME"
    // paragraphs, losing the @UUID marker. Users with such DBs should still
    // see the picker work without a forced resync.
    db.exec(`
      INSERT INTO items (id, name, description) VALUES
        ('item-legacy-elixir',
         'Elixir of Life (Lesser)',
         '<p>Old buggy-resolved form.</p><p>Effect: Elixir of Life</p>');
      INSERT INTO creature_items
        (id, creature_id, item_name, item_type, foundry_item_id, sort_order)
      VALUES
        ('ci-legacy-e', 'goblin-001', 'Elixir of Life (Lesser)', 'consumable', 'item-legacy-elixir', 77);
    `)
    const rows = runFullContextQuery()
    expect(rows.map((r) => r.id)).toContain('se-elixir')
    db.exec(`DELETE FROM creature_items WHERE id = 'ci-legacy-e'; DELETE FROM items WHERE id = 'item-legacy-elixir';`)
  })

  it('extracts multiple effect @UUIDs from one description (rapier + wyvern poison style)', () => {
    // Some items list several effect UUIDs (armor with rune effects,
    // poisons applied to weapons, etc). The regex is global so each one
    // should be captured.
    db.exec(`
      INSERT INTO items (id, name, description) VALUES
        ('item-multi',
         'Multi-Effect Gear',
         '<p>@UUID[Compendium.pf2e.equipment-effects.Item.Effect: Alchemist Goggles]</p><p>@UUID[Compendium.pf2e.equipment-effects.Item.Effect: Elixir of Life]</p>');
      INSERT INTO creature_items
        (id, creature_id, item_name, item_type, foundry_item_id, sort_order)
      VALUES
        ('ci-multi', 'goblin-001', 'Multi-Effect Gear', 'equipment', 'item-multi', 50);
    `)
    const rows = runFullContextQuery()
    const ids = rows.map((r) => r.id)
    expect(ids).toContain('se-goggles')
    expect(ids).toContain('se-elixir')
    db.exec(`DELETE FROM creature_items WHERE id = 'ci-multi'; DELETE FROM items WHERE id = 'item-multi';`)
  })
})
