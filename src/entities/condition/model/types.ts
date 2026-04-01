export type { ConditionSlug, ValuedCondition } from '@engine'

// ActiveCondition: flat record per combatant condition for UI rendering.
// ConditionManager is source of truth — this is the reactive view synced to Zustand.
export interface ActiveCondition {
  combatantId: string
  slug: string         // ConditionSlug value
  value?: number       // Only present for valued conditions
  isLocked?: boolean   // Locked conditions skip auto-decrement
  grantedBy?: string   // Slug of condition that granted this one (chain icon)
}
