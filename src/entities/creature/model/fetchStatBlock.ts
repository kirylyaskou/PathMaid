import { fetchCreatureById, getCreatureSpellcasting, getCreatureItems } from '@/shared/api'
import type { SpellcastingSection, SpellsByRank } from '@/entities/spell'
import { toCreatureStatBlockData } from './mappers'
import type { CreatureStatBlockData } from './types'

/**
 * Async stat block loader — fetches creature row + spellcasting from DB
 * and returns a fully populated CreatureStatBlockData with spellcasting sections.
 */
export async function fetchCreatureStatBlockData(id: string): Promise<CreatureStatBlockData | null> {
  const row = await fetchCreatureById(id)
  if (!row) return null

  let base = toCreatureStatBlockData(row)

  const equipment = await getCreatureItems(id)
  if (equipment.length > 0) base = { ...base, equipment }

  const { entries, spells } = await getCreatureSpellcasting(id)
  if (entries.length === 0) return base

  // Group creature spell list items by entry_id → rank
  const spellsByEntry = new Map<string, Map<number, { name: string; foundryId: string | null }[]>>()
  for (const spell of spells) {
    if (!spellsByEntry.has(spell.entry_id)) spellsByEntry.set(spell.entry_id, new Map())
    const byRank = spellsByEntry.get(spell.entry_id)!
    if (!byRank.has(spell.rank_prepared)) byRank.set(spell.rank_prepared, [])
    byRank.get(spell.rank_prepared)!.push({
      name: spell.spell_name,
      foundryId: spell.spell_foundry_id,
    })
  }

  const spellcasting: SpellcastingSection[] = entries.map((entry) => {
    const byRank = spellsByEntry.get(entry.id) ?? new Map()
    const slotsRaw = entry.slots
      ? (JSON.parse(entry.slots) as Record<string, { max: number; value: number }>)
      : {}

    const spellsByRank: SpellsByRank[] = Array.from(byRank.entries())
      .sort(([a], [b]) => a - b)
      .map(([rank, rankSpells]) => {
        const slotKey = `slot${rank}`
        const slotMax = slotsRaw[slotKey]?.max ?? 0
        return {
          rank,
          slots: slotMax,
          spells: rankSpells.map((s: { name: string; foundryId: string | null }) => ({ ...s, entryId: entry.id })),
        }
      })

    return {
      entryId: entry.id,
      entryName: entry.entry_name,
      tradition: entry.tradition ?? 'arcane',
      castType: entry.cast_type ?? 'prepared',
      spellDc: entry.spell_dc ?? 0,
      spellAttack: entry.spell_attack ?? 0,
      spellsByRank,
    }
  })

  return { ...base, spellcasting }
}
