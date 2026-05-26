import type { CustomItemInput, CustomItemRow } from '@/shared/api'

export function customItemRowToInput(row: CustomItemRow): CustomItemInput {
  return {
    name: row.name,
    item_type: row.item_type,
    level: row.level,
    rarity: row.rarity,
    bulk: row.bulk,
    price_gp: row.price_gp,
    traits: row.traits,
    description: row.description,
    source_text: row.source_text,
    usage: row.usage,
    damage_formula: row.damage_formula,
    damage_type: row.damage_type,
    weapon_category: row.weapon_category,
    weapon_group: row.weapon_group,
    ac_bonus: row.ac_bonus,
    dex_cap: row.dex_cap,
    check_penalty: row.check_penalty,
    speed_penalty: row.speed_penalty,
    strength_req: row.strength_req,
    consumable_category: row.consumable_category,
    uses_max: row.uses_max,
    rules_json: row.rules_json,
    variants_json: row.variants_json,
    base_item_id: row.base_item_id,
  }
}

export function isCustomItemDirty(current: CustomItemInput, saved: CustomItemInput): boolean {
  return JSON.stringify(current) !== JSON.stringify(saved)
}
