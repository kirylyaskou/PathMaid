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
  isHazard: boolean        // true for hazard rows
  hazardRef: string | null // hazard.id for hazard rows, null for creatures
  hazardType?: 'simple' | 'complex' // from JOIN with hazards table; undefined for non-hazards
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

export async function updateEncounterName(id: string, name: string): Promise<void> {
  const db = await getDb()
  await db.execute(`UPDATE encounters SET name = ? WHERE id = ?`, [name, id])
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
          is_npc, weak_elite_tier, creature_level, sort_order, is_hazard, hazard_ref)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.id, encounterId, c.creatureRef, c.displayName, c.initiative,
       c.hp, c.maxHp, c.tempHp, c.isNPC ? 1 : 0, c.weakEliteTier, c.creatureLevel, i,
       c.isHazard ? 1 : 0, c.hazardRef ?? null]
    )
  }
}

export async function loadEncounterCombatants(encounterId: string): Promise<EncounterCombatantRow[]> {
  const db = await getDb()
  const rows = await db.select<Array<{
    id: string; encounter_id: string; creature_ref: string | null; display_name: string;
    initiative: number; hp: number; max_hp: number; temp_hp: number; is_npc: number;
    weak_elite_tier: string; creature_level: number; sort_order: number;
    is_hazard: number; hazard_ref: string | null; hazard_type: string | null
  }>>(
    `SELECT ec.*, h.hazard_type
     FROM encounter_combatants ec
     LEFT JOIN hazards h ON ec.hazard_ref = h.id
     WHERE ec.encounter_id = ?
     ORDER BY ec.sort_order`,
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
    isHazard: r.is_hazard === 1,
    hazardRef: r.hazard_ref ?? null,
    hazardType: r.hazard_type ? (r.hazard_type as 'simple' | 'complex') : undefined,
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

// ── Spell slot tracking ───────────────────────────────────────────────────────

export interface SpellSlotRow {
  encounterId: string
  combatantId: string
  entryId: string
  rank: number
  usedCount: number
}

export async function saveSpellSlotUsage(
  encounterId: string,
  combatantId: string,
  entryId: string,
  rank: number,
  usedCount: number
): Promise<void> {
  const db = await getDb()
  if (usedCount === 0) {
    await db.execute(
      `DELETE FROM encounter_spell_slots WHERE encounter_id=? AND combatant_id=? AND entry_id=? AND rank=?`,
      [encounterId, combatantId, entryId, rank]
    )
  } else {
    await db.execute(
      `INSERT OR REPLACE INTO encounter_spell_slots (encounter_id, combatant_id, entry_id, rank, used_count) VALUES (?,?,?,?,?)`,
      [encounterId, combatantId, entryId, rank, usedCount]
    )
  }
}

export async function loadSpellSlots(
  encounterId: string,
  combatantId: string
): Promise<SpellSlotRow[]> {
  const db = await getDb()
  const rows = await db.select<{ encounter_id: string; combatant_id: string; entry_id: string; rank: number; used_count: number }[]>(
    `SELECT * FROM encounter_spell_slots WHERE encounter_id=? AND combatant_id=?`,
    [encounterId, combatantId]
  )
  return rows.map((r) => ({
    encounterId: r.encounter_id,
    combatantId: r.combatant_id,
    entryId: r.entry_id,
    rank: r.rank,
    usedCount: r.used_count,
  }))
}

// ── Spell overrides ───────────────────────────────────────────────────────────

export interface SpellOverrideRow {
  id: string
  encounterId: string
  combatantId: string
  entryId: string
  spellName: string
  rank: number
  isRemoved: boolean
  sortOrder: number
}

export async function loadSpellOverrides(
  encounterId: string,
  combatantId: string
): Promise<SpellOverrideRow[]> {
  const db = await getDb()
  const rows = await db.select<{
    id: string; encounter_id: string; combatant_id: string; entry_id: string;
    spell_name: string; rank: number; is_removed: number; sort_order: number
  }[]>(
    `SELECT * FROM encounter_combatant_spells WHERE encounter_id=? AND combatant_id=?`,
    [encounterId, combatantId]
  )
  return rows.map((r) => ({
    id: r.id,
    encounterId: r.encounter_id,
    combatantId: r.combatant_id,
    entryId: r.entry_id,
    spellName: r.spell_name,
    rank: r.rank,
    isRemoved: r.is_removed === 1,
    sortOrder: r.sort_order,
  }))
}

export async function upsertSpellOverride(override: SpellOverrideRow): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT OR REPLACE INTO encounter_combatant_spells
       (id, encounter_id, combatant_id, entry_id, spell_name, rank, is_removed, sort_order)
     VALUES (?,?,?,?,?,?,?,?)`,
    [override.id, override.encounterId, override.combatantId, override.entryId,
     override.spellName, override.rank, override.isRemoved ? 1 : 0, override.sortOrder]
  )
}

export async function deleteSpellOverride(id: string): Promise<void> {
  const db = await getDb()
  await db.execute(`DELETE FROM encounter_combatant_spells WHERE id=?`, [id])
}

// ── Item overrides ────────────────────────────────────────────────────────────

export interface EncounterItemRow {
  id: string
  encounterId: string
  combatantId: string
  itemName: string
  itemFoundryId: string | null
  itemType: string
  quantity: number
  damageFormula: string | null
  acBonus: number | null
  isRemoved: boolean
}

export async function loadItemOverrides(
  encounterId: string,
  combatantId: string
): Promise<EncounterItemRow[]> {
  const db = await getDb()
  const rows = await db.select<{
    id: string; encounter_id: string; combatant_id: string; item_name: string;
    item_foundry_id: string | null; item_type: string; quantity: number;
    damage_formula: string | null; ac_bonus: number | null; is_removed: number
  }[]>(
    `SELECT * FROM encounter_combatant_items WHERE encounter_id=? AND combatant_id=?`,
    [encounterId, combatantId]
  )
  return rows.map((r) => ({
    id: r.id,
    encounterId: r.encounter_id,
    combatantId: r.combatant_id,
    itemName: r.item_name,
    itemFoundryId: r.item_foundry_id,
    itemType: r.item_type,
    quantity: r.quantity,
    damageFormula: r.damage_formula,
    acBonus: r.ac_bonus,
    isRemoved: r.is_removed === 1,
  }))
}

export async function upsertItemOverride(item: EncounterItemRow): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT OR REPLACE INTO encounter_combatant_items
       (id, encounter_id, combatant_id, item_name, item_foundry_id, item_type, quantity, damage_formula, ac_bonus, is_removed)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [item.id, item.encounterId, item.combatantId, item.itemName, item.itemFoundryId,
     item.itemType, item.quantity, item.damageFormula, item.acBonus, item.isRemoved ? 1 : 0]
  )
}

export async function deleteItemOverride(id: string): Promise<void> {
  const db = await getDb()
  await db.execute(`DELETE FROM encounter_combatant_items WHERE id=?`, [id])
}

// ── Slot overrides (add/remove spell slots per encounter) ─────────────────────

export interface SlotOverrideRow {
  encounterId: string
  combatantId: string
  entryId: string
  rank: number
  slotDelta: number
}

export async function saveSlotOverride(
  encounterId: string,
  combatantId: string,
  entryId: string,
  rank: number,
  delta: number
): Promise<void> {
  const db = await getDb()
  if (delta === 0) {
    await db.execute(
      `DELETE FROM encounter_slot_overrides WHERE encounter_id=? AND combatant_id=? AND entry_id=? AND rank=?`,
      [encounterId, combatantId, entryId, rank]
    )
  } else {
    await db.execute(
      `INSERT OR REPLACE INTO encounter_slot_overrides (encounter_id, combatant_id, entry_id, rank, slot_delta) VALUES (?,?,?,?,?)`,
      [encounterId, combatantId, entryId, rank, delta]
    )
  }
}

export async function loadSlotOverrides(
  encounterId: string,
  combatantId: string
): Promise<SlotOverrideRow[]> {
  const db = await getDb()
  const rows = await db.select<{ encounter_id: string; combatant_id: string; entry_id: string; rank: number; slot_delta: number }[]>(
    `SELECT * FROM encounter_slot_overrides WHERE encounter_id=? AND combatant_id=?`,
    [encounterId, combatantId]
  )
  return rows.map((r) => ({
    encounterId: r.encounter_id,
    combatantId: r.combatant_id,
    entryId: r.entry_id,
    rank: r.rank,
    slotDelta: r.slot_delta,
  }))
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
  // Reset spell slots — all slots restored on encounter reset
  await db.execute(
    `DELETE FROM encounter_spell_slots WHERE encounter_id=?`,
    [encounterId]
  )
  // Reset slot overrides — base slot counts restored on encounter reset
  await db.execute(
    `DELETE FROM encounter_slot_overrides WHERE encounter_id=?`,
    [encounterId]
  )
  // Reset item overrides — base inventory restored on encounter reset
  await db.execute(
    `DELETE FROM encounter_combatant_items WHERE encounter_id=?`,
    [encounterId]
  )
  // Reset staging pool — fresh start on encounter reset
  await db.execute(
    `DELETE FROM encounter_staging_combatants WHERE encounter_id=?`,
    [encounterId]
  )
  // clear prepared-spell cast marks on refresh
  await db.execute(
    `DELETE FROM encounter_prepared_casts WHERE encounter_id=?`,
    [encounterId]
  )
}

// ── Prepared spell cast marks ─────────────────────────────────────────

export interface PreparedCastRow {
  encounterId: string
  combatantId: string
  entryId: string
  rank: number
  spellSlotKey: string
}

export async function loadPreparedCasts(
  encounterId: string,
  combatantId: string
): Promise<PreparedCastRow[]> {
  const db = await getDb()
  const rows = await db.select<{
    encounter_id: string
    combatant_id: string
    entry_id: string
    rank: number
    spell_slot_key: string
  }[]>(
    `SELECT * FROM encounter_prepared_casts WHERE encounter_id=? AND combatant_id=?`,
    [encounterId, combatantId]
  )
  return rows.map((r) => ({
    encounterId: r.encounter_id,
    combatantId: r.combatant_id,
    entryId: r.entry_id,
    rank: r.rank,
    spellSlotKey: r.spell_slot_key,
  }))
}

export async function markPreparedSpellCast(
  encounterId: string,
  combatantId: string,
  entryId: string,
  rank: number,
  spellSlotKey: string
): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT OR IGNORE INTO encounter_prepared_casts
       (encounter_id, combatant_id, entry_id, rank, spell_slot_key)
     VALUES (?, ?, ?, ?, ?)`,
    [encounterId, combatantId, entryId, rank, spellSlotKey]
  )
}

export async function unmarkPreparedSpellCast(
  encounterId: string,
  combatantId: string,
  entryId: string,
  rank: number,
  spellSlotKey: string
): Promise<void> {
  const db = await getDb()
  await db.execute(
    `DELETE FROM encounter_prepared_casts
     WHERE encounter_id=? AND combatant_id=? AND entry_id=? AND rank=? AND spell_slot_key=?`,
    [encounterId, combatantId, entryId, rank, spellSlotKey]
  )
}

// ── Staging pool ──────────────────────────────────────────────────────────────

export interface EncounterStagingRow {
  id: string
  encounterId: string
  kind: 'npc' | 'pc' | 'hazard'
  creatureRef: string
  displayName: string
  hp: number
  maxHp: number
  tempHp: number
  creatureLevel: number
  weakEliteTier: 'normal' | 'weak' | 'elite'
  round: number | null
  sortOrder: number
}

export async function saveEncounterStagingCombatants(
  encounterId: string,
  staging: EncounterStagingRow[]
): Promise<void> {
  const db = await getDb()
  await db.execute(
    `DELETE FROM encounter_staging_combatants WHERE encounter_id = ?`,
    [encounterId]
  )
  for (let i = 0; i < staging.length; i++) {
    const s = staging[i]
    await db.execute(
      // Column `enter_round` is the physical name for the domain field `round` —
      // see migrations/0026_fix_staging_round_column.sql for the rationale (avoids
      // SQLite's `round()` function name collision + its double-quote identifier quirk).
      `INSERT INTO encounter_staging_combatants
         (id, encounter_id, kind, creature_ref, display_name, hp, max_hp, temp_hp,
          creature_level, weak_elite_tier, enter_round, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [s.id, encounterId, s.kind, s.creatureRef, s.displayName,
       s.hp, s.maxHp, s.tempHp, s.creatureLevel, s.weakEliteTier, s.round ?? null, i]
    )
  }
}

export async function loadEncounterStagingCombatants(
  encounterId: string
): Promise<EncounterStagingRow[]> {
  const db = await getDb()
  const rows = await db.select<Array<{
    id: string
    encounter_id: string
    kind: string
    creature_ref: string
    display_name: string
    hp: number
    max_hp: number
    temp_hp: number
    creature_level: number
    weak_elite_tier: string
    enter_round: number | null
    sort_order: number
  }>>(
    // Explicit column list — avoids SELECT * relying on physical column order and makes
    // the enter_round → round mapping (see 0026 migration) obvious.
    `SELECT id, encounter_id, kind, creature_ref, display_name, hp, max_hp, temp_hp,
            creature_level, weak_elite_tier, enter_round, sort_order
     FROM encounter_staging_combatants
     WHERE encounter_id = ?
     ORDER BY sort_order`,
    [encounterId]
  )
  return rows.map((r) => ({
    id: r.id,
    encounterId: r.encounter_id,
    kind: r.kind as 'npc' | 'pc' | 'hazard',
    creatureRef: r.creature_ref,
    displayName: r.display_name,
    hp: r.hp,
    maxHp: r.max_hp,
    tempHp: r.temp_hp,
    creatureLevel: r.creature_level,
    weakEliteTier: r.weak_elite_tier as 'normal' | 'weak' | 'elite',
    round: r.enter_round,
    sortOrder: r.sort_order,
  }))
}
