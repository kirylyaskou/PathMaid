// Combatant is a runtime concept: creature in an active combat slot.
// Conditions are managed by ConditionManager (module-level) and stored in useConditionStore.

interface CombatantBase {
  id: string           // uuid — unique per combat slot
  displayName: string
  initiative: number
  hp: number
  maxHp: number
  tempHp: number
  // Creature level, needed for drained-hp reduction (level × drained value).
  level?: number
  // Base maxHp before drained reduction — set lazily the first time drained is applied.
  baseMaxHp?: number
  // Initiative bonus (e.g. hazard stealth DC) — applied when combat starts.
  initiativeBonus?: number
}

/** NPC — creature from bestiary or session-only quick-add creature. */
export interface NpcCombatant extends CombatantBase {
  kind: 'npc'
  creatureRef: string  // creature entity id; empty string for session-only quick-add
  // Session-only AC for Quick Add creatures (not stored in DB, not tied to creatureRef).
  ac?: number
  // Shield Raised toggle (session-only). shieldAcBonus holds the actual bonus from item data.
  shieldRaised?: boolean
  // AC bonus from the equipped shield — set when creature stat block is loaded.
  shieldAcBonus?: number | null
  // Multiple Attack Penalty index for the current turn (0 = first attack, 1/2 = subsequent).
  mapIndex?: number
  iwrImmunities?: string[]
  iwrWeaknesses?: { type: string; value: number }[]
  iwrResistances?: { type: string; value: number }[]
}

/** PC — player character from Pathbuilder import or session-only custom PC. */
export interface PcCombatant extends CombatantBase {
  kind: 'pc'
  creatureRef: string  // character record id; empty string for session-only custom PC
}

/** Hazard — trap or environmental hazard. */
export interface HazardCombatant extends CombatantBase {
  kind: 'hazard'
  creatureRef: string  // hazard entity id
}

export type Combatant = NpcCombatant | PcCombatant | HazardCombatant

// ─── Type Guards ─────────────────────────────────────────────────────────────

export function isNpc(c: Combatant): c is NpcCombatant { return c.kind === 'npc' }
export function isPc(c: Combatant): c is PcCombatant { return c.kind === 'pc' }
export function isHazardCombatant(c: Combatant): c is HazardCombatant { return c.kind === 'hazard' }

// ─── Migration Helper ─────────────────────────────────────────────────────────

/** Derive `kind` discriminant from legacy boolean flags (backward compat for old persistence data). */
export function kindFromLegacy(isNPC: boolean, isHazard: boolean): 'npc' | 'pc' | 'hazard' {
  if (isHazard) return 'hazard'
  if (isNPC) return 'npc'
  return 'pc'
}

// ─── Patch Type ───────────────────────────────────────────────────────────────

/** Allowed fields for updateCombatant. Excludes id, kind, and HP fields that have dedicated setters
 *  (updateHp, updateTempHp, setMaxHp) so direct Object.assign cannot bypass their guards. */
export type CombatantPatch = Omit<Partial<NpcCombatant>, 'id' | 'kind' | 'hp' | 'maxHp' | 'tempHp'>
