import { getDb } from '@/shared/db'

export interface EncounterRecord {
  id: string
  name: string
  partyLevel: number
  partySize: number
  round: number
  turn: number
  activeCombatantId: string | null
  isRunning: boolean
  createdAt: string
}

export interface EncounterCombatantRow {
  id: string
  encounterId: string
  creatureRef: string
  displayName: string
  initiative: number
  hp: number
  maxHp: number
  tempHp: number
  isNPC: boolean
  weakEliteTier: 'normal' | 'weak' | 'elite'
  creatureLevel: number
  sortOrder: number
}

export interface EncounterConditionRow {
  combatantId: string
  slug: string
  value?: number
  isLocked?: boolean
  grantedBy?: string
  formula?: string
}

export interface EncounterSnapshot {
  id: string
  name: string
  partyLevel: number
  partySize: number
  round: number
  turn: number
  activeCombatantId: string | null
  isRunning: boolean
  combatants: EncounterCombatantRow[]
  conditions: EncounterConditionRow[]
}

export async function createEncounter(
  id: string,
  name: string,
  partyLevel: number,
  partySize: number
): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT OR IGNORE INTO encounters (id, name, party_level, party_size) VALUES (?, ?, ?, ?)`,
    [id, name, partyLevel, partySize]
  )
}

export async function listEncounters(): Promise<EncounterRecord[]> {
  const db = await getDb()
  const rows = await db.select<Array<{
    id: string; name: string; party_level: number; party_size: number;
    round: number; turn: number; active_combatant_id: string | null;
    is_running: number; created_at: string
  }>>(
    `SELECT id, name, party_level, party_size, round, turn, active_combatant_id, is_running, created_at
     FROM encounters ORDER BY created_at DESC`,
    []
  )
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    partyLevel: r.party_level,
    partySize: r.party_size,
    round: r.round,
    turn: r.turn,
    activeCombatantId: r.active_combatant_id,
    isRunning: r.is_running === 1,
    createdAt: r.created_at,
  }))
}

export async function deleteEncounter(id: string): Promise<void> {
  const db = await getDb()
  await db.execute(`DELETE FROM encounters WHERE id = ?`, [id])
}

export async function saveEncounterCombatants(
  encounterId: string,
  combatants: EncounterCombatantRow[]
): Promise<void> {
  const db = await getDb()
  await db.execute(`DELETE FROM encounter_combatants WHERE encounter_id = ?`, [encounterId])
  for (let i = 0; i < combatants.length; i++) {
    const c = combatants[i]
    await db.execute(
      `INSERT INTO encounter_combatants
         (id, encounter_id, creature_ref, display_name, initiative, hp, max_hp, temp_hp,
          is_npc, weak_elite_tier, creature_level, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.id, encounterId, c.creatureRef, c.displayName, c.initiative,
       c.hp, c.maxHp, c.tempHp, c.isNPC ? 1 : 0, c.weakEliteTier, c.creatureLevel, i]
    )
  }
}

export async function loadEncounterCombatants(encounterId: string): Promise<EncounterCombatantRow[]> {
  const db = await getDb()
  const rows = await db.select<Array<{
    id: string; encounter_id: string; creature_ref: string | null; display_name: string;
    initiative: number; hp: number; max_hp: number; temp_hp: number; is_npc: number;
    weak_elite_tier: string; creature_level: number; sort_order: number
  }>>(
    `SELECT * FROM encounter_combatants WHERE encounter_id = ? ORDER BY sort_order`,
    [encounterId]
  )
  return rows.map((r) => ({
    id: r.id,
    encounterId: r.encounter_id,
    creatureRef: r.creature_ref ?? '',
    displayName: r.display_name,
    initiative: r.initiative,
    hp: r.hp,
    maxHp: r.max_hp,
    tempHp: r.temp_hp,
    isNPC: r.is_npc === 1,
    weakEliteTier: (r.weak_elite_tier as 'normal' | 'weak' | 'elite'),
    creatureLevel: r.creature_level,
    sortOrder: r.sort_order,
  }))
}

export async function saveEncounterConditions(
  encounterId: string,
  conditions: EncounterConditionRow[]
): Promise<void> {
  const db = await getDb()
  await db.execute(
    `DELETE FROM encounter_conditions
     WHERE combatant_id IN (SELECT id FROM encounter_combatants WHERE encounter_id = ?)`,
    [encounterId]
  )
  for (const cond of conditions) {
    await db.execute(
      `INSERT INTO encounter_conditions (combatant_id, slug, value, is_locked, granted_by, formula)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [cond.combatantId, cond.slug, cond.value ?? null, cond.isLocked ? 1 : 0,
       cond.grantedBy ?? null, cond.formula ?? null]
    )
  }
}

export async function loadEncounterConditions(encounterId: string): Promise<EncounterConditionRow[]> {
  const db = await getDb()
  const rows = await db.select<Array<{
    combatant_id: string; slug: string; value: number | null;
    is_locked: number; granted_by: string | null; formula: string | null
  }>>(
    `SELECT ec.* FROM encounter_conditions ec
     JOIN encounter_combatants cb ON ec.combatant_id = cb.id
     WHERE cb.encounter_id = ?`,
    [encounterId]
  )
  return rows.map((r) => ({
    combatantId: r.combatant_id,
    slug: r.slug,
    value: r.value ?? undefined,
    isLocked: r.is_locked === 1 ? true : undefined,
    grantedBy: r.granted_by ?? undefined,
    formula: r.formula ?? undefined,
  }))
}

/** Full save: UPDATE encounter header + DELETE/re-INSERT combatants + conditions */
export async function saveEncounterState(snapshot: EncounterSnapshot): Promise<void> {
  const db = await getDb()
  await db.execute(
    `UPDATE encounters
     SET round=?, turn=?, active_combatant_id=?, is_running=?, updated_at=datetime('now')
     WHERE id=?`,
    [snapshot.round, snapshot.turn, snapshot.activeCombatantId, snapshot.isRunning ? 1 : 0, snapshot.id]
  )
  await saveEncounterCombatants(snapshot.id, snapshot.combatants)
  await saveEncounterConditions(snapshot.id, snapshot.conditions)
}

/** Lightweight combat write-back: UPDATE hp/tempHp/initiative in place (preserves tier/level/sort_order) */
export async function saveEncounterCombatState(
  encounterId: string,
  round: number,
  turn: number,
  activeCombatantId: string | null,
  isRunning: boolean,
  combatants: Array<{ id: string; hp: number; tempHp: number; initiative: number }>,
  conditions: EncounterConditionRow[]
): Promise<void> {
  const db = await getDb()
  await db.execute(
    `UPDATE encounters SET round=?, turn=?, active_combatant_id=?, is_running=?, updated_at=datetime('now') WHERE id=?`,
    [round, turn, activeCombatantId, isRunning ? 1 : 0, encounterId]
  )
  for (const c of combatants) {
    await db.execute(
      `UPDATE encounter_combatants SET hp=?, temp_hp=?, initiative=? WHERE id=?`,
      [c.hp, c.tempHp, c.initiative, c.id]
    )
  }
  await saveEncounterConditions(encounterId, conditions)
}

export async function loadEncounterState(encounterId: string): Promise<EncounterSnapshot | null> {
  const db = await getDb()
  const records = await db.select<Array<{
    id: string; name: string; party_level: number; party_size: number;
    round: number; turn: number; active_combatant_id: string | null; is_running: number
  }>>(
    `SELECT id, name, party_level, party_size, round, turn, active_combatant_id, is_running
     FROM encounters WHERE id = ?`,
    [encounterId]
  )
  if (records.length === 0) return null
  const r = records[0]
  const combatants = await loadEncounterCombatants(encounterId)
  const conditions = await loadEncounterConditions(encounterId)
  return {
    id: r.id,
    name: r.name,
    partyLevel: r.party_level,
    partySize: r.party_size,
    round: r.round,
    turn: r.turn,
    activeCombatantId: r.active_combatant_id,
    isRunning: r.is_running === 1,
    combatants,
    conditions,
  }
}

/** Reset: restore hp=max_hp, clear conditions, reset round/turn state */
export async function resetEncounterCombat(encounterId: string): Promise<void> {
  const db = await getDb()
  await db.execute(
    `UPDATE encounters SET round=0, turn=0, active_combatant_id=NULL, is_running=0, updated_at=datetime('now') WHERE id=?`,
    [encounterId]
  )
  await db.execute(
    `UPDATE encounter_combatants SET hp=max_hp, temp_hp=0 WHERE encounter_id=?`,
    [encounterId]
  )
  await db.execute(
    `DELETE FROM encounter_conditions
     WHERE combatant_id IN (SELECT id FROM encounter_combatants WHERE encounter_id=?)`,
    [encounterId]
  )
}
