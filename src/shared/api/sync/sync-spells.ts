import { getDb } from '@/shared/db'
import { BATCH_SIZE } from './types'
import { parseCompendiumId } from './sync-core'
import type { RawEntity } from './types'

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

export async function extractAndInsertSpells(entities: RawEntity[]): Promise<void> {
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

export async function extractCreatureSpellcasting(entities: RawEntity[]): Promise<void> {
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
            id: `${entity.id}:${it._id as string}`,
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
          const spellTraits = ((sys.traits as Record<string, unknown>)?.value as string[]) ?? []
          const isCantrip = spellTraits.includes('cantrip')
          const locationRaw = (sys.location as Record<string, unknown>)?.value as string ?? ''
          spellItems.push({
            id: `${entity.id}:${it._id as string}`,
            creature_id: entity.id,
            entry_id: locationRaw ? `${entity.id}:${locationRaw}` : '',
            spell_foundry_id: parseCompendiumId(stats.compendiumSource as string | undefined),
            spell_name: it.name as string,
            rank_prepared: isCantrip ? 0 : ((sys.level as Record<string, unknown>)?.value as number ?? 0),
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
