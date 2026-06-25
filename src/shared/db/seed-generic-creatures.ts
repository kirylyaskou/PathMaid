import type Database from '@tauri-apps/plugin-sql'
import genericCreatureRows from './seeds/generic-creatures.json'

const SOURCE_PACK = 'generic-creatures'
const SEED_VERSION = '1'
const SEED_VERSION_KEY = 'seed.generic-creatures.version'
const CHUNK_SIZE = 50

interface GenericCreatureSeedRow {
  id: string
  name: string
  type: 'npc'
  level: number | null
  hp: number | null
  ac: number | null
  fort: number | null
  ref: number | null
  will: number | null
  perception: number | null
  traits: string
  rarity: string | null
  size: string | null
  source_pack: string
  raw_json: unknown
  source_name: string
  source_adventure: string | null
}

const rows = genericCreatureRows as GenericCreatureSeedRow[]
export const GENERIC_CREATURE_SEED_COUNT = rows.length

export async function seedGenericCreatures(
  db: Database,
  options: { rebuildFts?: boolean } = {},
): Promise<void> {
  const versionRows = await db.select<{ value: string }[]>(
    'SELECT value FROM sync_metadata WHERE key = ?',
    [SEED_VERSION_KEY],
  )
  const countRows = await db.select<{ n: number }[]>(
    'SELECT COUNT(*) AS n FROM entities WHERE source_pack = ?',
    [SOURCE_PACK],
  )

  if (versionRows[0]?.value === SEED_VERSION && countRows[0]?.n === rows.length) {
    return
  }

  await db.execute('BEGIN TRANSACTION', [])
  try {
    await db.execute('DELETE FROM entities WHERE source_pack = ?', [SOURCE_PACK])

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE)
      const placeholders = chunk
        .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .join(', ')
      const values = chunk.flatMap((row) => [
        row.id,
        row.name,
        row.type,
        row.level,
        row.hp,
        row.ac,
        row.fort,
        row.ref,
        row.will,
        row.perception,
        row.traits,
        row.rarity,
        row.size,
        row.source_pack,
        JSON.stringify(row.raw_json),
        row.source_name,
        row.source_adventure,
      ])

      await db.execute(
        `INSERT OR REPLACE INTO entities
          (id, name, type, level, hp, ac, fort, ref, will, perception, traits, rarity, size, source_pack, raw_json, source_name, source_adventure)
         VALUES ${placeholders}`,
        values,
      )
    }

    await db.execute(
      'INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?)',
      [SEED_VERSION_KEY, SEED_VERSION],
    )
    await db.execute('COMMIT', [])
  } catch (err) {
    await db.execute('ROLLBACK', [])
    throw err
  }

  if (options.rebuildFts ?? true) {
    await db.execute("INSERT INTO entities_fts(entities_fts) VALUES('rebuild')", [])
  }
}
