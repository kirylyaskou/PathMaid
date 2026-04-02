import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getDb } from '@/shared/db'
import { setSyncMetadata } from './db'

interface RawEntity {
  id: string
  name: string
  entity_type: string
  level: number | null
  hp: number | null
  ac: number | null
  fort: number | null
  ref_save: number | null
  will: number | null
  perception: number | null
  traits: string | null
  rarity: string | null
  size: string | null
  source_pack: string | null
  raw_json: string
  source_name: string | null
}

interface SyncProgress {
  stage: string
  current: number
  total: number
}

export type SyncProgressCallback = (stage: string, current: number, total: number) => void

const BATCH_SIZE = 500

interface RawSpell {
  id: string
  name: string
  rank: number
  traditions: string | null
  traits: string | null
  description: string | null
  damage: string | null
  area: string | null
  range_text: string | null
  duration_text: string | null
  action_cost: string | null
  save_stat: string | null
  source_book: string | null
  source_pack: string | null
}

interface RawSpellcastingEntry {
  id: string
  creature_id: string
  entry_name: string
  tradition: string | null
  cast_type: string | null
  spell_dc: number | null
  spell_attack: number | null
  slots: string | null
}

interface RawCreatureSpell {
  id: string
  creature_id: string
  entry_id: string
  spell_foundry_id: string | null
  spell_name: string
  rank_prepared: number
  sort_order: number
}

function parseCompendiumId(source: string | undefined): string | null {
  if (!source) return null
  // "Compendium.pf2e.spells-srd.Item.AbCdEfGhI" → "AbCdEfGhI"
  const match = source.match(/Item\.([A-Za-z0-9]+)$/)
  return match ? match[1] : null
}

function getLocalizeValue(obj: Record<string, unknown>, dotPath: string): string | undefined {
  const parts = dotPath.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === 'string' ? current : undefined
}

async function extractAndInsertSpells(entities: RawEntity[]): Promise<void> {
  const db = await getDb()

  await db.execute('DELETE FROM spells', [])
  await db.execute("INSERT INTO spells_fts(spells_fts) VALUES('delete-all')", [])

  const spells: RawSpell[] = []
  for (const entity of entities) {
    if (entity.entity_type !== 'spell') continue
    try {
      const raw = JSON.parse(entity.raw_json)
      const sys = raw.system ?? {}
      const damageObj = sys.damage ?? {}
      const areaObj = sys.area
      const defenseObj = sys.defense

      spells.push({
        id: entity.id,
        name: entity.name,
        rank: sys.level?.value ?? 0,
        traditions: sys.traits?.traditions?.length
          ? JSON.stringify(sys.traits.traditions)
          : null,
        traits: sys.traits?.value?.length
          ? JSON.stringify(sys.traits.value)
          : null,
        description: sys.description?.value ?? null,
        damage: Object.keys(damageObj).length ? JSON.stringify(damageObj) : null,
        area: areaObj ? JSON.stringify(areaObj) : null,
        range_text: sys.range?.value || null,
        duration_text: sys.duration?.value || null,
        action_cost: sys.time?.value || null,
        save_stat: defenseObj?.save?.statistic ?? null,
        source_book: sys.publication?.title || null,
        source_pack: entity.source_pack,
      })
    } catch {
      // skip malformed spell JSON
    }
  }

  for (let i = 0; i < spells.length; i += BATCH_SIZE) {
    const batch = spells.slice(i, i + BATCH_SIZE)
    const placeholders = batch
      .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .join(', ')
    const values = batch.flatMap((s) => [
      s.id, s.name, s.rank, s.traditions, s.traits,
      s.description, s.damage, s.area, s.range_text,
      s.duration_text, s.action_cost, s.save_stat,
      s.source_book, s.source_pack,
    ])
    await db.execute(
      `INSERT OR REPLACE INTO spells (id, name, rank, traditions, traits, description, damage, area, range_text, duration_text, action_cost, save_stat, source_book, source_pack) VALUES ${placeholders}`,
      values
    )
  }

  if (spells.length > 0) {
    await db.execute("INSERT INTO spells_fts(spells_fts) VALUES('rebuild')", [])
  }
}

async function extractCreatureSpellcasting(entities: RawEntity[]): Promise<void> {
  const db = await getDb()

  await db.execute('DELETE FROM creature_spellcasting_entries', [])
  await db.execute('DELETE FROM creature_spell_lists', [])

  const entries: RawSpellcastingEntry[] = []
  const spellItems: RawCreatureSpell[] = []

  for (const entity of entities) {
    if (entity.entity_type !== 'npc') continue
    try {
      const raw = JSON.parse(entity.raw_json)
      const items: unknown[] = raw.items ?? []

      for (const item of items) {
        const it = item as Record<string, unknown>
        if (it.type === 'spellcastingEntry') {
          const sys = (it.system as Record<string, unknown>) ?? {}
          const spelldc = (sys.spelldc as Record<string, unknown>) ?? {}
          entries.push({
            id: it._id as string,
            creature_id: entity.id,
            entry_name: it.name as string,
            tradition: (sys.tradition as Record<string, unknown>)?.value as string ?? null,
            cast_type: (sys.prepared as Record<string, unknown>)?.value as string ?? null,
            spell_dc: (spelldc.dc as number) ?? null,
            spell_attack: (spelldc.value as number) ?? null,
            slots: sys.slots ? JSON.stringify(sys.slots) : null,
          })
        } else if (it.type === 'spell') {
          const sys = (it.system as Record<string, unknown>) ?? {}
          const stats = (it._stats as Record<string, unknown>) ?? {}
          spellItems.push({
            id: `${entity.id}:${it._id as string}`,
            creature_id: entity.id,
            entry_id: (sys.location as Record<string, unknown>)?.value as string ?? '',
            spell_foundry_id: parseCompendiumId(stats.compendiumSource as string | undefined),
            spell_name: it.name as string,
            rank_prepared: (sys.level as Record<string, unknown>)?.value as number ?? 0,
            sort_order: (it.sort as number) ?? 0,
          })
        }
      }
    } catch {
      // skip malformed creature JSON
    }
  }

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE)
    const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ')
    const values = batch.flatMap((e) => [
      e.id, e.creature_id, e.entry_name, e.tradition,
      e.cast_type, e.spell_dc, e.spell_attack, e.slots,
    ])
    await db.execute(
      `INSERT OR REPLACE INTO creature_spellcasting_entries (id, creature_id, entry_name, tradition, cast_type, spell_dc, spell_attack, slots) VALUES ${placeholders}`,
      values
    )
  }

  for (let i = 0; i < spellItems.length; i += BATCH_SIZE) {
    const batch = spellItems.slice(i, i + BATCH_SIZE)
    const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ')
    const values = batch.flatMap((s) => [
      s.id, s.creature_id, s.entry_id,
      s.spell_foundry_id, s.spell_name, s.rank_prepared, s.sort_order,
    ])
    await db.execute(
      `INSERT OR REPLACE INTO creature_spell_lists (id, creature_id, entry_id, spell_foundry_id, spell_name, rank_prepared, sort_order) VALUES ${placeholders}`,
      values
    )
  }
}

async function batchInsertEntities(
  entities: RawEntity[],
  onProgress?: SyncProgressCallback
): Promise<void> {
  const db = await getDb()

  await db.execute('DELETE FROM entities', [])

  const total = entities.length
  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = entities.slice(i, i + BATCH_SIZE)
    const placeholders = batch
      .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .join(', ')
    const values = batch.flatMap((e) => [
      e.id,
      e.name,
      e.entity_type,
      e.level,
      e.hp,
      e.ac,
      e.fort,
      e.ref_save,
      e.will,
      e.perception,
      e.traits,
      e.rarity,
      e.size,
      e.source_pack,
      e.raw_json,
      e.source_name,
    ])

    await db.execute(
      `INSERT OR REPLACE INTO entities (id, name, type, level, hp, ac, fort, ref, will, perception, traits, rarity, size, source_pack, raw_json, source_name) VALUES ${placeholders}`,
      values
    )

    onProgress?.(
      `Importing entities (${Math.min(i + BATCH_SIZE, total)} / ${total})...`,
      Math.min(i + BATCH_SIZE, total),
      total
    )
  }

  onProgress?.('Building search index...', total, total)
  await db.execute(
    "INSERT INTO entities_fts(entities_fts) VALUES('rebuild')",
    []
  )

  await setSyncMetadata('entity_count', String(total))
  await setSyncMetadata('last_sync_date', new Date().toISOString())
}

export async function syncFoundryData(
  onProgress?: SyncProgressCallback
): Promise<number> {
  const unlisten = await listen<SyncProgress>('sync-progress', (event) => {
    onProgress?.(event.payload.stage, event.payload.current, event.payload.total)
  })

  try {
    onProgress?.('Downloading ZIP...', 0, 0)
    const entities = await invoke<RawEntity[]>('sync_foundry_data', {
      url: null,
    })

    // Download en.json for @Localize token resolution
    let enJson: Record<string, unknown> = {}
    try {
      onProgress?.('Downloading localization data...', 0, 0)
      const enResponse = await fetch(
        'https://raw.githubusercontent.com/foundryvtt/pf2e/v13-dev/static/lang/en.json'
      )
      if (enResponse.ok) {
        enJson = await enResponse.json() as Record<string, unknown>
      }
    } catch {
      // en.json download failure is non-fatal — @Localize tokens remain in raw_json
      // and will be stripped by resolveFoundryTokens() fallback at display time
    }

    // Resolve @Localize tokens in raw_json before inserting into SQLite
    // Values must be JSON-escaped since they're spliced into a JSON string
    if (Object.keys(enJson).length > 0) {
      for (const entity of entities) {
        entity.raw_json = entity.raw_json.replace(
          /@Localize\[([^\]]+)\]/g,
          (_, key: string) => {
            const val = getLocalizeValue(enJson, key) ?? ''
            return JSON.stringify(val).slice(1, -1)
          }
        )
      }
    }

    onProgress?.('Importing entities...', 0, entities.length)
    await batchInsertEntities(entities, onProgress)

    onProgress?.('Importing spells...', 0, 0)
    await extractAndInsertSpells(entities)

    onProgress?.('Importing spellcasting data...', 0, 0)
    await extractCreatureSpellcasting(entities)

    return entities.length
  } finally {
    unlisten()
  }
}

export async function importLocalPacks(
  packDir: string,
  onProgress?: SyncProgressCallback
): Promise<number> {
  const unlisten = await listen<SyncProgress>('sync-progress', (event) => {
    onProgress?.(event.payload.stage, event.payload.current, event.payload.total)
  })

  try {
    onProgress?.('Reading local packs...', 0, 0)
    const entities = await invoke<RawEntity[]>('import_local_packs', {
      packDir,
    })

    onProgress?.('Importing entities...', 0, entities.length)
    await batchInsertEntities(entities, onProgress)

    onProgress?.('Importing spells...', 0, 0)
    await extractAndInsertSpells(entities)

    onProgress?.('Importing spellcasting data...', 0, 0)
    await extractCreatureSpellcasting(entities)

    return entities.length
  } finally {
    unlisten()
  }
}
