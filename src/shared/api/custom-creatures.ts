import { getDb } from '@/shared/db'

export interface CustomCreatureApiStatBlock {
  id: string
  name: string
  level: number
  hp: number
  ac: number
  fort: number
  ref: number
  will: number
  perception: number
  stealth: number | null
  rarity: string
  size: string
  type: string
  traits: string[]
  builderMode?: 'manual' | 'auto'
  abilityMods?: { str: number; dex: number; con: number; int: number; wis: number; cha: number }
  immunities?: unknown[]
  weaknesses?: unknown[]
  resistances?: unknown[]
  speeds: Record<string, number | null>
  strikes: unknown[]
  abilities: unknown[]
  skills: unknown[]
  languages: string[]
  senses: string[]
  auras?: unknown[]
  rituals?: unknown[]
  equipment?: unknown[]
  customItemRefs?: unknown[]
  source: string
}

export interface CustomCreatureRow {
  id: string
  name: string
  level: number
  rarity: string
  source_type: 'foundry_clone' | 'scratch'
  created_at: string
  updated_at: string
}

export interface CustomCreatureRecord<TStatBlock = CustomCreatureApiStatBlock> extends CustomCreatureRow {
  statBlock: TStatBlock
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function toDataJson<TData extends CustomCreatureApiStatBlock>(data: TData): string {
  const { id: _id, ...rest } = data
  return JSON.stringify(rest)
}

function nowISO(): string {
  return new Date().toISOString()
}

function parseStatBlock(row: {
  id: string
  data_json: string
}): CustomCreatureApiStatBlock {
  const parsed = JSON.parse(row.data_json) as Partial<CustomCreatureApiStatBlock>

  // backfill new fields so older records read without crashing.
  const backfilled: CustomCreatureApiStatBlock = {
    ...(parsed as CustomCreatureApiStatBlock),
    id: row.id,
    builderMode: parsed.builderMode ?? 'manual',
    abilityMods: parsed.abilityMods ?? { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    immunities: parsed.immunities ?? [],
    weaknesses: parsed.weaknesses ?? [],
    resistances: parsed.resistances ?? [],
    auras: parsed.auras ?? undefined,   // optional — preserve undefined distinction from []
    rituals: parsed.rituals ?? undefined,
    equipment: parsed.equipment ?? [],
    customItemRefs: parsed.customItemRefs ?? [],
  }
  return backfilled
}

function defaultStatBlock(id: string): CustomCreatureApiStatBlock {
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
    stealth: null,
    rarity: 'common',
    size: 'Medium',
    type: 'npc',
    traits: [],
    builderMode: 'manual',
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
    equipment: [],
    customItemRefs: [],
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

export async function getCustomCreatureById<TStatBlock extends CustomCreatureApiStatBlock = CustomCreatureApiStatBlock>(
  id: string
): Promise<CustomCreatureRecord<TStatBlock> | null> {
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
    statBlock: parseStatBlock(row) as TStatBlock,
  }
}

export async function getCustomCreatureByName<TStatBlock extends CustomCreatureApiStatBlock = CustomCreatureApiStatBlock>(
  name: string
): Promise<CustomCreatureRecord<TStatBlock> | null> {
  const db = await getDb()
  const rows = await db.select<(CustomCreatureRow & { data_json: string })[]>(
    'SELECT id, name, level, rarity, source_type, created_at, updated_at, data_json FROM custom_creatures WHERE name = ? LIMIT 1',
    [name]
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
    statBlock: parseStatBlock(row) as TStatBlock,
  }
}

export async function createImportedCustomCreature(
  data: CustomCreatureApiStatBlock,
  importedAt: Date = new Date()
): Promise<{ id: string; name: string }> {
  const db = await getDb()
  const baseName = data.name.trim() || 'Imported Creature'
  const date = importedAt.toISOString().slice(0, 10)
  const existing = await db.select<Array<{ name: string }>>(
    `SELECT name FROM custom_creatures
     WHERE name = ? OR name LIKE ?`,
    [baseName, `${baseName} Copy% - ${date}`]
  )
  const taken = new Set(existing.map((row) => row.name))
  let name = baseName
  if (taken.has(name)) {
    name = `${baseName} Copy - ${date}`
    let n = 2
    while (taken.has(name)) {
      name = `${baseName} Copy ${n} - ${date}`
      n += 1
    }
  }

  const id = await createCustomCreature({ ...data, name }, 'foundry_clone')
  return { id, name }
}

export async function createCustomCreature(
  data: CustomCreatureApiStatBlock,
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
  data: CustomCreatureApiStatBlock
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
