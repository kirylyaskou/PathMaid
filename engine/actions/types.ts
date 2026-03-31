import type { ConditionSlug } from '../conditions/conditions'

// ─── Action Type Definitions (D-01) ──────────────────────────────────────────
// Source: refs/pf2e/actions/ JSON schema — system.actionType.value, system.actions.value,
// system.category, system.traits.value

export type ActionType = 'action' | 'reaction' | 'free' | 'passive'
export type ActionCost = 1 | 2 | 3 | null
export type ActionCategory = 'offensive' | 'defensive' | 'interaction' | null

// ─── Degree Key (shared with degree-of-success module) ──────────────────────
export type DegreeKey = 'critical_success' | 'success' | 'failure' | 'critical_failure'

// ─── Action Outcome Descriptors (D-02, D-04) ────────────────────────────────
// Declarative maps keyed by degree-of-success. Engine does NOT roll dice or
// execute action resolution — it stores what each action does per degree.

export interface ActionOutcome {
  /** Conditions applied to the TARGET at this degree */
  conditions?: Array<{ slug: ConditionSlug; value?: number }>
  /** Damage descriptor at this degree (declarative string, not rolled) */
  damage?: string
  /** Free-text effect description for outcomes not expressible as conditions/damage */
  effect?: string
}

export type ActionOutcomeMap = Partial<Record<DegreeKey, ActionOutcome>>

// ─── Action Interface (D-01, D-03) ──────────────────────────────────────────
export interface Action {
  slug: string
  name: string
  actionType: ActionType
  cost: ActionCost
  category: ActionCategory
  traits: string[]
  /** Present only for ~40 combat-relevant actions (D-03). Undefined for data-only entries. */
  outcomes?: ActionOutcomeMap
}
