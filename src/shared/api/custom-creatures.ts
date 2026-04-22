import { getDb } from '@/shared/db'
import type { CreatureStatBlockData } from '@/entities/creature/model/types'
import type {
  CustomCreatureRow,
  CustomCreatureStatBlock,
} from '@/entities/creature/model/custom-creature-types'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function toDataJson(data: CreatureStatBlockData): string {
  const { equipment: _eq, id: _id, ...rest } = data
  return JSON.stringify(rest)
}

function nowISO(): string {
  return new Date().toISOString()
}

function parseStatBlock(row: {
  id: string
  data_json: string
}): CreatureStatBlockData {
  const parsed = JSON.parse(row.data_json) as Partial<CreatureStatBlockData>

  // backfill new fields so pre-D-08 records read without crashing.
  const backfilled: CreatureStatBlockData = {
    ...(parsed as CreatureStatBlockData),
    id: row.id,
    abilityMods: parsed.abilityMods ?? { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    immunities: parsed.immunities ?? [],
    weaknesses: parsed.weaknesses ?? [],
    resistances: parsed.resistances ?? [],
    auras: parsed.auras ?? undefined,   // optional — preserve undefined distinction from []
    rituals: parsed.rituals ?? undefined,
  }
  return backfilled
}

function defaultStatBlock(id: string): CreatureStatBlockData {
  return {
    id,
    name: 'New Creature',
    level: 1,
    hp: 10,
    ac: 10,
    fort: 0,
    ref: 0,
    will: 0,
    perception: 0,
    rarity: 'common',
    size: 'Medium',
    type: 'npc',
    traits: [],
    abilityMods: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    immunities: [],
    weaknesses: [],
    resistances: [],
    speeds: { land: 25 },
    strikes: [],
    abilities: [],
    skills: [],
    languages: [],
    senses: [],
    auras: [],
    rituals: [],
    source: 'custom',
  }
}

// ---------------------------------------------------------------------------
// Exported CRUD functions
// ---------------------------------------------------------------------------

export async function getAllCustomCreatures(): Promise<CustomCreatureRow[]> {
  const db = await getDb()
  return db.select<CustomCreatureRow[]>(
    'SELECT id, name, level, rarity, source_type, created_at, updated_at FROM custom_creatures ORDER BY updated_at DESC'
  )
}

export async function getCustomCreatureById(
  id: string
): Promise<CustomCreatureStatBlock | null> {
  const db = await getDb()
  const rows = await db.select<(CustomCreatureRow & { data_json: string })[]>(
    'SELECT id, name, level, rarity, source_type, created_at, updated_at, data_json FROM custom_creatures WHERE id = ?',
    [id]
  )
  if (rows.length === 0) return null
  const row = rows[0]
  return {
    id: row.id,
    name: row.name,
    level: row.level,
    rarity: row.rarity,
    source_type: row.source_type,
    created_at: row.created_at,
    updated_at: row.updated_at,
    statBlock: parseStatBlock(row),
  }
}

export async function createCustomCreature(
  data: CreatureStatBlockData,
  sourceType: 'foundry_clone' | 'scratch'
): Promise<string> {
  const id = `custom-${crypto.randomUUID()}`
  const now = nowISO()
  const statBlock = sourceType === 'scratch' ? defaultStatBlock(id) : { ...data, id }
  const db = await getDb()
  await db.execute(
    `INSERT INTO custom_creatures (id, name, level, rarity, source_type, created_at, updated_at, data_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      statBlock.name,
      statBlock.level,
      statBlock.rarity,
      sourceType,
      now,
      now,
      toDataJson(statBlock),
    ]
  )
  return id
}

export async function updateCustomCreature(
  id: string,
  data: CreatureStatBlockData
): Promise<void> {
  const db = await getDb()
  await db.execute(
    `UPDATE custom_creatures SET name = ?, level = ?, rarity = ?, updated_at = ?, data_json = ? WHERE id = ?`,
    [data.name, data.level, data.rarity, nowISO(), toDataJson(data), id]
  )
}

export async function deleteCustomCreature(id: string): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM custom_creatures WHERE id = ?', [id])
}
