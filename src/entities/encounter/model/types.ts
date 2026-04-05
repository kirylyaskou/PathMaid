// EncounterCombatant — a creature stored in a saved encounter (SQLite-derived).
// creatureLevel is the base Foundry level; weakEliteTier adjusts displayed level by ±1.
export interface EncounterCombatant {
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
  isHazard?: boolean       // true for hazard rows
  hazardRef?: string | null // hazard.id reference
}

// Encounter — a saved encounter entity (SQLite-derived).
// Includes combat state fields that are written back during active encounter-backed combat.
export interface Encounter {
  id: string
  name: string
  partyLevel: number
  partySize: number
  round: number
  turn: number
  activeCombatantId: string | null
  isRunning: boolean
  createdAt: string
  combatants: EncounterCombatant[]
}
