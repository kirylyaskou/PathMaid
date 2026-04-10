// Combatant is a runtime concept: creature in an active combat slot.
// Conditions are managed by ConditionManager (module-level) and stored in useConditionStore.
export interface Combatant {
  id: string           // uuid — unique per combat slot
  creatureRef: string  // creature entity id or empty string for PCs
  displayName: string
  initiative: number
  hp: number
  maxHp: number
  tempHp: number
  isNPC: boolean
  // Creature level, needed for drained-hp reduction (level × drained value).
  level?: number
  // Base maxHp before drained reduction — set lazily the first time drained is applied
  // so the reduction can be restored when drained is removed or reduced.
  baseMaxHp?: number
  // Session-only AC for Quick Add creatures (not stored in DB, not tied to creatureRef).
  ac?: number
  // Shield Raised toggle (session-only). shieldAcBonus holds the actual bonus from item data.
  shieldRaised?: boolean
  // AC bonus from the equipped shield — set when creature stat block is loaded. null/undefined = no shield.
  shieldAcBonus?: number | null
  // Multiple Attack Penalty index for the current turn (0 = first attack, 1/2 = subsequent).
  // Resets to 0 when this combatant's turn ends.
  mapIndex?: number
  // Hazard combatant — rendered with hazard styling, no stat block lookup.
  isHazard?: boolean
  // Hazard initiative bonus (e.g. stealth DC) — applied when combat starts.
  initiativeBonus?: number
  iwrImmunities?: string[]
  iwrWeaknesses?: { type: string; value: number }[]
  iwrResistances?: { type: string; value: number }[]
}
