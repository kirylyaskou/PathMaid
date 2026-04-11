import { getDb } from '@/shared/db'
import { BATCH_SIZE } from './types'
import { ITEM_TYPES, parseItemPrice, parseDamageFormula, parseCompendiumId } from './sync-core'
import type { RawEntity } from './types'

interface RawItem {
  id: string
  name: string
  item_type: string
  level: number
  rarity: string | null
  bulk: string | null
  price_gp: number | null
  traits: string | null
  description: string | null
  source_book: string | null
  source_pack: string | null
  damage_formula: string | null
  damage_type: string | null
  weapon_category: string | null
  weapon_group: string | null
  ac_bonus: number | null
  dex_cap: number | null
  check_penalty: number | null
  speed_penalty: number | null
  strength_req: number | null
  consumable_category: string | null
  uses_max: number | null
  usage: string | null
  linked_spell_id: string | null
}

interface RawCreatureItem {
  id: string
  creature_id: string
  item_name: string
  item_type: string
  foundry_item_id: string | null
  quantity: number
  bulk: string | null
  damage_formula: string | null
  ac_bonus: number | null
  traits: string | null
  sort_order: number
}

export async function extractAndInsertItems(entities: RawEntity[]): Promise<void> {
  const db = await getDb()

  await db.execute('DELETE FROM items', [])
  await db.execute("INSERT INTO items_fts(items_fts) VALUES('delete-all')", [])

  const items: RawItem[] = []
  for (const entity of entities) {
    if (!ITEM_TYPES.includes(entity.entity_type)) continue
    try {
      const raw = JSON.parse(entity.raw_json)
      const sys = raw.system ?? {}
      const traits = sys.traits?.value
      const { formula: damageFormula, type: damageType } = parseDamageFormula(sys.damage ?? {})

      const embeddedSpell = sys.spell as Record<string, unknown> | undefined
      const spellStats = embeddedSpell?._stats as Record<string, unknown> | undefined
      const linkedSpellId = spellStats?.compendiumSource
        ? parseCompendiumId(spellStats.compendiumSource as string)
        : null

      items.push({
        id: entity.id,
        name: entity.name,
        item_type: entity.entity_type,
        level: sys.level?.value ?? 0,
        rarity: sys.traits?.rarity ?? null,
        bulk: typeof sys.bulk?.value === 'string' || typeof sys.bulk?.value === 'number'
          ? String(sys.bulk.value)
          : null,
        price_gp: parseItemPrice(sys.price ?? {}),
        traits: traits?.length ? JSON.stringify(traits) : null,
        description: sys.description?.value ?? null,
        source_book: sys.publication?.title || null,
        source_pack: entity.source_pack,
        damage_formula: damageFormula,
        damage_type: damageType,
        weapon_category: sys.category ?? null,
        weapon_group: sys.group ?? null,
        ac_bonus: sys.acBonus ?? null,
        dex_cap: sys.dexCap ?? null,
        check_penalty: sys.checkPenalty ?? null,
        speed_penalty: sys.speedPenalty ?? null,
        strength_req: sys.strength ?? null,
        consumable_category: entity.entity_type === 'consumable' ? (sys.category ?? null) : null,
        uses_max: sys.uses?.max ?? null,
        usage: sys.usage?.value ?? null,
        linked_spell_id: linkedSpellId,
      })
    } catch {
      // skip malformed item JSON
    }
  }

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE)
    const placeholders = batch
      .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .join(', ')
    const values = batch.flatMap((it) => [
      it.id, it.name, it.item_type, it.level, it.rarity, it.bulk, it.price_gp,
      it.traits, it.description, it.source_book, it.source_pack,
      it.damage_formula, it.damage_type, it.weapon_category, it.weapon_group,
      it.ac_bonus, it.dex_cap, it.check_penalty, it.speed_penalty, it.strength_req,
      it.consumable_category, it.uses_max, it.usage, it.linked_spell_id,
    ])
    await db.execute(
      `INSERT OR REPLACE INTO items (id, name, item_type, level, rarity, bulk, price_gp, traits, description, source_book, source_pack, damage_formula, damage_type, weapon_category, weapon_group, ac_bonus, dex_cap, check_penalty, speed_penalty, strength_req, consumable_category, uses_max, usage, linked_spell_id) VALUES ${placeholders}`,
      values
    )
  }

  if (items.length > 0) {
    await db.execute("INSERT INTO items_fts(items_fts) VALUES('rebuild')", [])
  }
}

export async function extractCreatureItems(entities: RawEntity[]): Promise<void> {
  const db = await getDb()

  await db.execute('DELETE FROM creature_items', [])

  const SKIP_TYPES = new Set(['spellcastingEntry', 'spell', 'melee', 'ranged', 'action', 'lore'])
  const creatureItems: RawCreatureItem[] = []

  for (const entity of entities) {
    if (entity.entity_type !== 'npc') continue
    try {
      const raw = JSON.parse(entity.raw_json)
      const items: unknown[] = raw.items ?? []

      for (const item of items) {
        const it = item as Record<string, unknown>
        const itemType = it.type as string
        if (SKIP_TYPES.has(itemType)) continue
        if (!ITEM_TYPES.includes(itemType)) continue

        const sys = (it.system as Record<string, unknown>) ?? {}
        const stats = (it._stats as Record<string, unknown>) ?? {}
        const traits = (sys.traits as Record<string, unknown>)?.value
        const { formula: damageFormula } = parseDamageFormula((sys.damage as Record<string, unknown>) ?? {})
        const acBonus = (sys.acBonus as number) ?? null
        const sourceId = stats.compendiumSource as string | undefined
        const foundryItemId = parseCompendiumId(sourceId) ?? (it._id as string | undefined) ?? null

        creatureItems.push({
          id: `${entity.id}:${it._id as string}`,
          creature_id: entity.id,
          item_name: it.name as string,
          item_type: itemType,
          foundry_item_id: foundryItemId,
          quantity: (sys.quantity as number) ?? 1,
          bulk: typeof (sys.bulk as Record<string, unknown>)?.value === 'string' ||
            typeof (sys.bulk as Record<string, unknown>)?.value === 'number'
            ? String((sys.bulk as Record<string, unknown>).value)
            : null,
          damage_formula: damageFormula,
          ac_bonus: acBonus,
          traits: Array.isArray(traits) && traits.length ? JSON.stringify(traits) : null,
          sort_order: (it.sort as number) ?? 0,
        })
      }
    } catch {
      // skip malformed creature JSON
    }
  }

  for (let i = 0; i < creatureItems.length; i += BATCH_SIZE) {
    const batch = creatureItems.slice(i, i + BATCH_SIZE)
    const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')
    const values = batch.flatMap((ci) => [
      ci.id, ci.creature_id, ci.item_name, ci.item_type, ci.foundry_item_id,
      ci.quantity, ci.bulk, ci.damage_formula, ci.ac_bonus, ci.traits, ci.sort_order,
    ])
    await db.execute(
      `INSERT OR REPLACE INTO creature_items (id, creature_id, item_name, item_type, foundry_item_id, quantity, bulk, damage_formula, ac_bonus, traits, sort_order) VALUES ${placeholders}`,
      values
    )
  }
}
