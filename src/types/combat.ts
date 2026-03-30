import type { WeakEliteTier } from '@/types/entity'
import type { ConditionManager } from '@/lib/pf2e'
import type { IwrData } from '@/lib/iwr-utils'

export interface Creature {
  id: string
  name: string
  maxHP: number
  currentHP: number
  ac: number
  initiative: number
  dexMod: number
  isCurrentTurn: boolean
  isDowned: boolean
  conditionManager: ConditionManager
  conditionVersion: number
  regenAmount?: number
  ongoingDamage?: number
  sourceId?: string
  tier?: WeakEliteTier
  level?: number   // creature level from Foundry raw_data; used by useEncounterStore for XP calc
  iwrData?: IwrData         // IWR snapshot populated at addFromBrowser time (Phase 11 IWR-02)
  persistentDamageFormula?: string  // persistent damage dice formula (Phase 11 COND-04)
}

export interface CombatState {
  creatures: Creature[]
  isActive: boolean
}
