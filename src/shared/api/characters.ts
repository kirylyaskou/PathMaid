import { getDb } from '@/shared/db'
import type { PathbuilderBuild } from '@engine'
import { buildPathbuilderFromFoundryPC } from './sync/sync-iconics-pc'

export interface CharacterRecord {
  id: string
  name: string
  class: string | null
  level: number | null
  ancestry: string | null
  rawJson: string
  notes: string
  createdAt: string
  // 70-06: Paizo provenance. NULL = user-imported (Pathbuilder export).
  // `__iconics__` sentinel = from iconics pack. Otherwise an adventure slug.
  sourceAdventure: string | null
}

type CharacterRow = {
  id: string
  name: string
  class: string | null
  level: number | null
  ancestry: string | null
  raw_json: string
  notes: string
  created_at: string
  source_adventure: string | null
  raw_foundry_json: string | null
}

function rowToRecord(r: CharacterRow): CharacterRecord {
  // v1.4.1 UAT fix: when the row carries the raw Foundry character JSON
  // (iconics + pregens), re-derive the PathbuilderBuild at load time so
  // parser improvements apply retroactively without forcing a re-sync.
  // Falls back to the stored raw_json on any derivation error.
  let rawJson = r.raw_json
  if (r.raw_foundry_json) {
    try {
      const doc = JSON.parse(r.raw_foundry_json)
      const build = buildPathbuilderFromFoundryPC(doc)
      if (build) rawJson = JSON.stringify(build)
    } catch {
      // Leave rawJson as-is on parse failure — the stored one is the
      // last-known good build, which is still better than a crash.
    }
  }
  return {
    id: r.id,
    name: r.name,
    class: r.class,
    level: r.level,
    ancestry: r.ancestry,
    rawJson,
    notes: r.notes,
    createdAt: r.created_at,
    sourceAdventure: r.source_adventure,
  }
}

export async function getAllCharacters(): Promise<CharacterRecord[]> {
  const db = await getDb()
  const rows = await db.select<CharacterRow[]>(
    `SELECT id, name, class, level, ancestry, raw_json, notes, created_at, source_adventure, raw_foundry_json
     FROM characters ORDER BY name ASC`,
    []
  )
  return rows.map(rowToRecord)
}

export async function getCharacterById(id: string): Promise<CharacterRecord | null> {
  const db = await getDb()
  const rows = await db.select<CharacterRow[]>(
    `SELECT id, name, class, level, ancestry, raw_json, notes, created_at, source_adventure, raw_foundry_json
     FROM characters WHERE id = ?`,
    [id]
  )
  return rows.length > 0 ? rowToRecord(rows[0]) : null
}

/**
 * Upsert a Pathbuilder character by name.
 * - First import: INSERT with new UUID id.
 * - Re-import (same name): UPDATE class/level/ancestry/raw_json; preserve id and created_at.
 * Returns the character's id.
 */
export async function upsertCharacter(build: PathbuilderBuild): Promise<string> {
  const db = await getDb()
  const id = crypto.randomUUID()
  await db.execute(
    `INSERT INTO characters (id, name, class, level, ancestry, raw_json, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, '', datetime('now'))
     ON CONFLICT(name) DO UPDATE SET
       class = excluded.class,
       level = excluded.level,
       ancestry = excluded.ancestry,
       raw_json = excluded.raw_json`,
    [
      id,
      build.name,
      build.class ?? null,
      build.level ?? null,
      build.ancestry ?? null,
      JSON.stringify(build),
    ]
  )
  // Return the actual id (may differ from generated id if record already existed)
  const rows = await db.select<{ id: string }[]>(
    `SELECT id FROM characters WHERE name = ?`,
    [build.name]
  )
  return rows[0].id
}

/**
 * Phase 70 / D-70-05 — insert an iconic/pregen-sourced character.
 * Iconics ship with the same names GMs' own imports might use (Amiri, Ezren,
 * Kyra, …) — per the locked decision, the user's import always wins:
 * if a character with the same name already exists AND that record is not
 * itself a prior iconic sync (`source_adventure IS NULL`) we SKIP and log.
 * Prior iconic syncs are overwritten (re-sync should refresh Paizo data).
 * Returns the character id that ended up in the DB, or `null` on error.
 */
export async function insertIconicCharacter(
  build: PathbuilderBuild,
  sourceAdventure: string,
  rawFoundryJson?: string
): Promise<string | null> {
  const db = await getDb()
  const existing = await db.select<{ id: string; source_adventure: string | null }[]>(
    `SELECT id, source_adventure FROM characters WHERE name = ?`,
    [build.name]
  )
  const foundryJson = rawFoundryJson ?? null
  if (existing.length > 0) {
    if (existing[0].source_adventure === null) {
      console.warn(
        `[sync-iconics] Skipping iconic "${build.name}" — user-imported character with same name already exists`
      )
      return existing[0].id
    }
    // Previous iconic sync — refresh it. Always overwrite raw_foundry_json
    // so a fresh sync repopulates the column even for rows created before
    // migration 0037.
    await db.execute(
      `UPDATE characters
         SET class = ?, level = ?, ancestry = ?, raw_json = ?, source_adventure = ?, raw_foundry_json = ?
       WHERE id = ?`,
      [
        build.class ?? null,
        build.level ?? null,
        build.ancestry ?? null,
        JSON.stringify(build),
        sourceAdventure,
        foundryJson,
        existing[0].id,
      ]
    )
    return existing[0].id
  }
  const id = crypto.randomUUID()
  try {
    await db.execute(
      `INSERT INTO characters (id, name, class, level, ancestry, raw_json, notes, created_at, source_adventure, raw_foundry_json)
       VALUES (?, ?, ?, ?, ?, ?, '', datetime('now'), ?, ?)`,
      [
        id,
        build.name,
        build.class ?? null,
        build.level ?? null,
        build.ancestry ?? null,
        JSON.stringify(build),
        sourceAdventure,
        foundryJson,
      ]
    )
    return id
  } catch (err) {
    console.warn(`[sync-iconics] Failed to insert iconic "${build.name}":`, err)
    return null
  }
}

export async function deleteCharacter(id: string): Promise<void> {
  const db = await getDb()
  await db.execute(`DELETE FROM characters WHERE id = ?`, [id])
}

export async function updateCharacterNotes(id: string, notes: string): Promise<void> {
  const db = await getDb()
  await db.execute(`UPDATE characters SET notes = ? WHERE id = ?`, [notes, id])
}
