import { fetchCreatureById, getCreatureSpellcasting, getCreatureItems, getCustomCreatureById } from '@/shared/api'
import { toCreatureStatBlockData } from './mappers'
import type {
  CreatureInnateFrequency,
  CreatureSpellcastingSection,
  CreatureSpellsByRank,
  CreatureStatBlockData,
} from './types'

function parseFrequency(json: string | null): CreatureInnateFrequency | undefined {
  if (!json) return undefined
  try {
    const parsed = JSON.parse(json) as CreatureInnateFrequency
    if (parsed.kind === 'at-will') return { kind: 'at-will' }
    if (parsed.kind === 'per' && typeof parsed.max === 'number' && parsed.max > 0) {
      return { kind: 'per', max: parsed.max, per: parsed.per }
    }
  } catch {
    // malformed JSON — fall through to undefined
  }
  return undefined
}

/**
 * Async stat block loader — fetches creature row + spellcasting from DB
 * and returns a fully populated CreatureStatBlockData with spellcasting sections.
 *
 * ids with the `custom-` prefix are routed to custom_creatures first;
 * bestiary lookup is skipped in that case (no extra DB round-trip).
 */
export async function fetchCreatureStatBlockData(id: string): Promise<CreatureStatBlockData | null> {
  // prefix-aware routing. Custom IDs are `custom-<uuid>` (see shared/api/custom-creatures.ts).
  if (id.startsWith('custom-')) {
    const custom = await getCustomCreatureById<CreatureStatBlockData>(id)
    return custom?.statBlock ?? null
  }

  const row = await fetchCreatureById(id)
  if (!row) return null

  let base = toCreatureStatBlockData(row)

  const equipment = await getCreatureItems(id)
  if (equipment.length > 0) base = { ...base, equipment }

  const { entries, spells } = await getCreatureSpellcasting(id)
  if (entries.length === 0) return base

  interface RankSpell {
    name: string
    foundryId: string | null
    frequency?: CreatureInnateFrequency
  }
  // Group creature spell list items by entry_id → rank
  const spellsByEntry = new Map<string, Map<number, RankSpell[]>>()
  for (const spell of spells) {
    if (!spellsByEntry.has(spell.entry_id)) spellsByEntry.set(spell.entry_id, new Map())
    const byRank = spellsByEntry.get(spell.entry_id)!
    if (!byRank.has(spell.rank_prepared)) byRank.set(spell.rank_prepared, [])
    byRank.get(spell.rank_prepared)!.push({
      name: spell.spell_name,
      foundryId: spell.spell_foundry_id,
      frequency: parseFrequency(spell.frequency_json),
    })
  }

  const spellcasting: CreatureSpellcastingSection[] = entries.map((entry) => {
    const byRank = spellsByEntry.get(entry.id) ?? new Map()
    const slotsRaw = entry.slots
      ? (JSON.parse(entry.slots) as Record<string, { max: number; value: number }>)
      : {}

    const spellsByRank: CreatureSpellsByRank[] = Array.from(byRank.entries())
      .sort(([a], [b]) => a - b)
      .map(([rank, rankSpells]) => {
        const slotKey = `slot${rank}`
        const slotMax = slotsRaw[slotKey]?.max ?? 0
        return {
          rank,
          slots: slotMax,
          spells: rankSpells.map((s: RankSpell) => ({ ...s, entryId: entry.id })),
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
