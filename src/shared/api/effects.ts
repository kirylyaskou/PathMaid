import { getDb } from '@/shared/db'
import type { SpellEffectRow } from '@/entities/spell-effect'

// 60-02: level = COALESCE(spells.rank, 1). Used by parseSpellEffectModifiers to
// evaluate @item.level in scaling FlatModifier expressions (Heroism etc.).
// Effects without a linked spell (spell_id IS NULL) fall back to level=1.
//
// 61-06 fix: category now keyed off Foundry source_pack first (added via
// migration 0033), then spell_id for spells that matched post-sync,
// finally name patterns as a last resort for rows with NULL source_pack.
// Pack IDs: 'pf2e.spell-effects', 'pf2e.equipment-effects', 'pf2e.other-effects',
// 'pf2e.feat-effects', 'pf2e.campaign-effects'. Match on LIKE to tolerate
// minor pack-id variations across PF2e releases.
const CATEGORY_EXPR = `
  CASE
    WHEN se.source_pack LIKE '%spell-effects%' THEN 'spell'
    WHEN se.source_pack LIKE '%equipment-effects%' THEN 'alchemical'
    WHEN se.spell_id IS NOT NULL THEN 'spell'
    WHEN LOWER(se.name) LIKE '%elixir%'
      OR LOWER(se.name) LIKE '%mutagen%' THEN 'alchemical'
    ELSE 'other'
  END
`
const SELECT_WITH_LEVEL = `
  SELECT se.id, se.name, se.rules_json, se.duration_json, se.description, se.spell_id,
         COALESCE(s.rank, 1) AS level,
         ${CATEGORY_EXPR} AS category
  FROM spell_effects se
  LEFT JOIN spells s ON se.spell_id = s.id
`

export async function listSpellEffects(): Promise<SpellEffectRow[]> {
  const db = await getDb()
  return db.select<SpellEffectRow[]>(
    `${SELECT_WITH_LEVEL} ORDER BY se.name`,
    []
  )
}

export async function searchSpellEffects(query: string): Promise<SpellEffectRow[]> {
  const db = await getDb()
  return db.select<SpellEffectRow[]>(
    `${SELECT_WITH_LEVEL} WHERE se.name LIKE ? ORDER BY se.name`,
    [`%${query}%`]
  )
}

// 61-01: effects whose linked spell is referenced by any combatant's spell list
// in this encounter. Custom creatures store spells in data_json blob — not
// queryable here; they contribute no context. Callers fall back to listSpellEffects
// when this returns empty.
export async function getContextEffectsForEncounter(
  encounterId: string
): Promise<SpellEffectRow[]> {
  const db = await getDb()
  return db.select<SpellEffectRow[]>(
    `${SELECT_WITH_LEVEL}
     WHERE se.spell_id IS NOT NULL
       AND se.spell_id IN (
         SELECT DISTINCT csl.spell_foundry_id
         FROM creature_spell_lists csl
         JOIN encounter_combatants ec
           ON ec.creature_ref = csl.creature_id
         WHERE ec.encounter_id = ?
           AND csl.spell_foundry_id IS NOT NULL
       )
     ORDER BY se.name`,
    [encounterId]
  )
}

export interface ActiveEffectRow {
  id: string
  effect_id: string
  applied_at: number
  remaining_turns: number
  name: string
  rules_json: string
  duration_json: string
  description: string | null
  level: number  // 60-02: @item.level for expression eval; COALESCE(spells.rank, 1)
}

export async function getActiveEffectsForCombatant(
  encounterId: string,
  combatantId: string
): Promise<ActiveEffectRow[]> {
  const db = await getDb()
  return db.select<ActiveEffectRow[]>(
    `SELECT ece.id, ece.effect_id, ece.applied_at, ece.remaining_turns,
            se.name, se.rules_json, se.duration_json, se.description,
            COALESCE(s.rank, 1) AS level
     FROM encounter_combatant_effects ece
     JOIN spell_effects se ON ece.effect_id = se.id
     LEFT JOIN spells s ON se.spell_id = s.id
     WHERE ece.encounter_id = ? AND ece.combatant_id = ?`,
    [encounterId, combatantId]
  )
}

export async function applyEffectToCombatant(
  encounterId: string,
  combatantId: string,
  effectId: string,
  remainingTurns: number
): Promise<string> {
  const db = await getDb()
  const id = crypto.randomUUID()
  const appliedAt = Math.floor(Date.now() / 1000)
  await db.execute(
    'INSERT INTO encounter_combatant_effects (id, encounter_id, combatant_id, effect_id, applied_at, remaining_turns) VALUES (?, ?, ?, ?, ?, ?)',
    [id, encounterId, combatantId, effectId, appliedAt, remainingTurns]
  )
  return id
}

export async function removeEffectFromCombatant(id: string): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM encounter_combatant_effects WHERE id = ?', [id])
}

export async function decrementEffectTurns(
  encounterId: string,
  combatantId: string
): Promise<string[]> {
  const db = await getDb()
  await db.execute(
    'UPDATE encounter_combatant_effects SET remaining_turns = remaining_turns - 1 WHERE encounter_id = ? AND combatant_id = ? AND remaining_turns > 0',
    [encounterId, combatantId]
  )
  const expired = await db.select<Array<{ id: string }>>(
    'SELECT id FROM encounter_combatant_effects WHERE encounter_id = ? AND combatant_id = ? AND remaining_turns <= 0',
    [encounterId, combatantId]
  )
  await db.execute(
    'DELETE FROM encounter_combatant_effects WHERE encounter_id = ? AND combatant_id = ? AND remaining_turns <= 0',
    [encounterId, combatantId]
  )
  return expired.map((r) => r.id)
}
