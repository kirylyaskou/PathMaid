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
  iwrImmunities?: string[]
  iwrWeaknesses?: { type: string; value: number }[]
  iwrResistances?: { type: string; value: number }[]
}
