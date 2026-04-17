import { getDb } from '@/shared/db'
import type { SpellEffectRow } from '@/entities/spell-effect'

export async function listSpellEffects(): Promise<SpellEffectRow[]> {
  const db = await getDb()
  return db.select<SpellEffectRow[]>(
    'SELECT id, name, rules_json, duration_json, description, spell_id FROM spell_effects ORDER BY name',
    []
  )
}

export async function searchSpellEffects(query: string): Promise<SpellEffectRow[]> {
  const db = await getDb()
  return db.select<SpellEffectRow[]>(
    'SELECT id, name, rules_json, duration_json, description, spell_id FROM spell_effects WHERE name LIKE ? ORDER BY name',
    [`%${query}%`]
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
}

export async function getActiveEffectsForCombatant(
  encounterId: string,
  combatantId: string
): Promise<ActiveEffectRow[]> {
  const db = await getDb()
  return db.select<ActiveEffectRow[]>(
    `SELECT ece.id, ece.effect_id, ece.applied_at, ece.remaining_turns,
            se.name, se.rules_json, se.duration_json, se.description
     FROM encounter_combatant_effects ece
     JOIN spell_effects se ON ece.effect_id = se.id
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
