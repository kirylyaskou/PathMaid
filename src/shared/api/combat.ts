import { getDb } from '@/shared/db'

export interface CombatCombatantRow {
  id: string
  creatureRef: string
  displayName: string
  initiative: number
  hp: number
  maxHp: number
  tempHp: number
  isNPC: boolean
}

export interface CombatConditionRow {
  combatantId: string
  slug: string
  value?: number
  isLocked?: boolean
  grantedBy?: string
}

export interface CombatSnapshot {
  id: string
  name: string
  round: number
  turn: number
  activeCombatantId: string | null
  isRunning: boolean
  combatants: CombatCombatantRow[]
  conditions: CombatConditionRow[]
}

export async function saveCombatState(state: CombatSnapshot): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT OR REPLACE INTO combats (id, name, round, turn, active_combatant_id, is_running, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    [state.id, state.name, state.round, state.turn, state.activeCombatantId, state.isRunning ? 1 : 0]
  )
  await db.execute('DELETE FROM combat_combatants WHERE combat_id = ?', [state.id])
  for (let i = 0; i < state.combatants.length; i++) {
    const c = state.combatants[i]
    await db.execute(
      `INSERT INTO combat_combatants (id, combat_id, creature_ref, display_name, initiative, hp, max_hp, temp_hp, is_npc, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.id, state.id, c.creatureRef, c.displayName, c.initiative, c.hp, c.maxHp, c.tempHp, c.isNPC ? 1 : 0, i]
    )
  }
  for (const cond of state.conditions) {
    await db.execute(
      `INSERT INTO combat_conditions (combatant_id, slug, value, is_locked, granted_by)
       VALUES (?, ?, ?, ?, ?)`,
      [cond.combatantId, cond.slug, cond.value ?? null, cond.isLocked ? 1 : 0, cond.grantedBy ?? null]
    )
  }
}

export async function loadCombatState(combatId: string): Promise<CombatSnapshot | null> {
  const db = await getDb()
  const combats = await db.select<Array<{
    id: string; name: string; round: number; turn: number;
    active_combatant_id: string | null; is_running: number
  }>>('SELECT * FROM combats WHERE id = ?', [combatId])
  if (combats.length === 0) return null
  const combat = combats[0]

  const rows = await db.select<Array<{
    id: string; creature_ref: string | null; display_name: string;
    initiative: number; hp: number; max_hp: number; temp_hp: number;
    is_npc: number; sort_order: number
  }>>(
    'SELECT * FROM combat_combatants WHERE combat_id = ? ORDER BY sort_order',
    [combatId]
  )
  const combatants: CombatCombatantRow[] = rows.map((r) => ({
    id: r.id,
    creatureRef: r.creature_ref ?? '',
    displayName: r.display_name,
    initiative: r.initiative,
    hp: r.hp,
    maxHp: r.max_hp,
    tempHp: r.temp_hp,
    isNPC: r.is_npc === 1,
  }))

  const condRows = await db.select<Array<{
    combatant_id: string; slug: string; value: number | null;
    is_locked: number; granted_by: string | null
  }>>(
    `SELECT cc.* FROM combat_conditions cc
     JOIN combat_combatants cb ON cc.combatant_id = cb.id
     WHERE cb.combat_id = ?`,
    [combatId]
  )
  const conditions: CombatConditionRow[] = condRows.map((r) => ({
    combatantId: r.combatant_id,
    slug: r.slug,
    value: r.value ?? undefined,
    isLocked: r.is_locked === 1 ? true : undefined,
    grantedBy: r.granted_by ?? undefined,
  }))

  return {
    id: combat.id,
    name: combat.name,
    round: combat.round,
    turn: combat.turn,
    activeCombatantId: combat.active_combatant_id,
    isRunning: combat.is_running === 1,
    combatants,
    conditions,
  }
}

export async function deleteCombat(combatId: string): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM combats WHERE id = ?', [combatId])
}

export async function listCombats(): Promise<Array<{ id: string; name: string; round: number; isRunning: boolean; updatedAt: string }>> {
  const db = await getDb()
  const rows = await db.select<Array<{
    id: string; name: string; round: number; is_running: number; updated_at: string
  }>>('SELECT id, name, round, is_running, updated_at FROM combats ORDER BY updated_at DESC')
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    round: r.round,
    isRunning: r.is_running === 1,
    updatedAt: r.updated_at,
  }))
}
