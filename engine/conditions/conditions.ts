// ─── Condition Slugs ─────────────────────────────────────────────────────────
// Source: Foundry VTT PF2e src/module/item/condition/values.ts (verified 2026-03-25)
// Source: AON https://2e.aonprd.com/Conditions.aspx (authoritative rule text)
export const CONDITION_SLUGS = [
  'blinded',
  'broken',
  'clumsy',
  'concealed',
  'confused',
  'controlled',
  'cursebound',
  'dazzled',
  'deafened',
  'doomed',
  'drained',
  'dying',
  'encumbered',
  'enfeebled',
  'fascinated',
  'fatigued',
  'fleeing',
  'friendly',
  'frightened',
  'grabbed',
  'helpful',
  'hidden',
  'hostile',
  'immobilized',
  'indifferent',
  'invisible',
  'malevolence',
  'observed',
  'off-guard',
  'paralyzed',
  'persistent-damage',
  'petrified',
  'prone',
  'quickened',
  'restrained',
  'sickened',
  'slowed',
  'stunned',
  'stupefied',
  'unconscious',
  'undetected',
  'unfriendly',
  'unnoticed',
  'wounded',
] as const
export type ConditionSlug = (typeof CONDITION_SLUGS)[number]

// Source: AON Rules.aspx?ID=775 — Condition Values
// Source: AON individual condition pages confirming numeric modifiers
export const VALUED_CONDITIONS = [
  'clumsy',
  'doomed',
  'drained',
  'dying',
  'enfeebled',
  'frightened',
  'sickened',
  'slowed',
  'stunned',
  'stupefied',
  'wounded',
] as const
export type ValuedCondition = (typeof VALUED_CONDITIONS)[number]

import {
  CONDITION_EFFECTS,
  CONDITION_OVERRIDES,
  CONDITION_GROUPS_EXTENDED,
  EXCLUSIVE_GROUPS,
} from './condition-effects'
import type { ConditionGrantEffect } from './condition-effects'
import type { Creature } from '../types'

// ─── Condition Groups ─────────────────────────────────────────────────────────
// Source: AON Conditions.aspx — Detection and Attitudes groupings
// Source: Foundry VTT PF2e ConditionGroup type — all 5 groups from system.group fields
// Note: Only 'detection' and 'attitudes' groups enforce mutual exclusivity (D-08, D-09, D-10).
//       'senses', 'abilities', and 'death' groups are informational only.
// Re-export extended groups as the canonical CONDITION_GROUPS
// Source: Foundry VTT PF2e refs/ JSON system.group fields
// 5 groups: detection (exclusive), attitudes (exclusive), senses, abilities, death
export const CONDITION_GROUPS = CONDITION_GROUPS_EXTENDED

// ─── ConditionManager ─────────────────────────────────────────────────────────

export class ConditionManager {
  private readonly conditions = new Map<ConditionSlug, number>()
  private readonly durations = new Map<ConditionSlug, number>()
  private readonly protected_ = new Set<ConditionSlug>()
  // Track which condition granted which other condition
  // Key = granted condition slug, Value = granter condition slug
  private readonly grantedBy = new Map<ConditionSlug, ConditionSlug>()
  // Depth counter guards against re-entrant grant application (e.g., dying->unconscious->blinded)
  private grantDepth = 0
  // Optional creature reference for condition immunity checking (D-25)
  private creature_: Creature | null = null

  /** Set creature context for condition immunity checking (D-25). */
  setCreature(creature: Creature | null): void {
    this.creature_ = creature
  }

  add(slug: ConditionSlug, value = 1): void {
    // 1. Immunity check (D-25) — if creature is immune to this condition, do nothing
    if (this.creature_) {
      const isImmune = this.creature_.immunities.some(imm => imm.type === slug)
      if (isImmune) return
    }

    // 2. Override mechanic (D-07) — remove conditions that this slug overrides
    // Source: refs/pf2e/conditions/ JSON system.overrides fields
    //   blinded overrides dazzled; stunned overrides slowed; attitude conditions override each other
    const overrides = CONDITION_OVERRIDES[slug]
    if (overrides) {
      for (const overridden of overrides) {
        this.removeInternal(overridden)
      }
    }

    // 3. Exclusive group enforcement (D-08, D-09, D-10)
    // Only 'detection' and 'attitudes' groups are mutually exclusive
    for (const [groupName, members] of Object.entries(CONDITION_GROUPS)) {
      if (members.includes(slug) && EXCLUSIVE_GROUPS.has(groupName)) {
        for (const member of members) {
          if (member !== slug) this.removeInternal(member)
        }
        break
      }
    }

    // 4. Dying special case — add wounded value to dying value, cap at death threshold
    // Source: AON dying condition page — "When you gain the dying condition, you must
    //         add your wounded value to the dying value you gain."
    if (slug === 'dying') {
      const wounded = this.conditions.get('wounded') ?? 0
      const rawValue = value + wounded
      // Death threshold capping (D-13, D-26): dying >= (4 - doomed) = dead
      const doomed = this.conditions.get('doomed') ?? 0
      const deathThreshold = 4 - doomed
      this.conditions.set('dying', Math.min(rawValue, deathThreshold))
      // Apply grants for dying (dying grants unconscious which grants blinded, off-guard, prone)
      this.applyGrantsFor(slug)
      return
    }

    // 5. Valued condition semantics — use Math.max (higher value wins, not additive)
    // Source: PF2e rules — "you can't have two instances of the same condition; use the higher value"
    const existing = this.conditions.get(slug)
    if (existing !== undefined && (VALUED_CONDITIONS as readonly string[]).includes(slug)) {
      this.conditions.set(slug, Math.max(existing, value))
    } else {
      this.conditions.set(slug, value)
    }

    // 6. Apply grant chains (D-05) — e.g., grabbed grants off-guard + immobilized
    this.applyGrantsFor(slug)
  }

  remove(slug: ConditionSlug): void {
    if (!this.conditions.has(slug)) return
    this.conditions.delete(slug)
    this.durations.delete(slug)
    this.protected_.delete(slug)
    this.grantedBy.delete(slug)

    // Remove conditions granted by this slug (D-05 grant chain cleanup)
    this.removeGranteesOf(slug)

    // Source: AON dying condition page — "Any time you lose the dying condition,
    //         you gain wounded 1, or increase wounded by 1 if already present."
    if (slug === 'dying') {
      const current = this.conditions.get('wounded') ?? 0
      this.conditions.set('wounded', current + 1)
    }
  }

  has(slug: ConditionSlug): boolean {
    return this.conditions.has(slug)
  }

  get(slug: ConditionSlug): number | undefined {
    return this.conditions.get(slug)
  }

  /** Set value directly without gain/add special-case logic (e.g., dying+wounded).
   *  Use for adjusting an existing condition value (recovery checks, etc.). */
  setValue(slug: ConditionSlug, value: number): void {
    if (this.conditions.has(slug)) {
      this.conditions.set(slug, value)
    }
  }

  // Source: PF2e CRB — frightened/sickened/stunned/slowed reduce by 1 at end of owner's turn
  endTurn(): void {
    const autoDecrement: ConditionSlug[] = ['frightened', 'sickened', 'stunned', 'slowed']
    for (const slug of autoDecrement) {
      if (!this.conditions.has(slug)) continue
      if (this.protected_.has(slug)) continue
      const current = this.conditions.get(slug)!
      if (current <= 1) {
        this.conditions.delete(slug)
      } else {
        this.conditions.set(slug, current - 1)
      }
    }
    for (const [slug, duration] of this.durations) {
      if (this.protected_.has(slug)) continue
      if (duration <= 1) {
        this.conditions.delete(slug)
        this.durations.delete(slug)
      } else {
        this.durations.set(slug, duration - 1)
      }
    }
  }

  setDuration(slug: ConditionSlug, rounds: number): void {
    this.durations.set(slug, rounds)
  }

  setProtected(slug: ConditionSlug, value: boolean): void {
    if (value) {
      this.protected_.add(slug)
    } else {
      this.protected_.delete(slug)
    }
  }

  isProtected(slug: ConditionSlug): boolean {
    return this.protected_.has(slug)
  }

  getAll(): Array<{ slug: ConditionSlug; value: number }> {
    return Array.from(this.conditions.entries()).map(([slug, value]) => ({ slug, value }))
  }

  /** Returns the slug of the condition that granted this condition, or undefined if independently applied. */
  getGranter(slug: ConditionSlug): ConditionSlug | undefined {
    return this.grantedBy.get(slug)
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  /** Remove a condition and clean up its metadata without triggering dying→wounded logic.
   *  Used by override and exclusivity logic in add(). */
  private removeInternal(slug: ConditionSlug): void {
    this.conditions.delete(slug)
    this.durations.delete(slug)
    this.protected_.delete(slug)
    this.grantedBy.delete(slug)
    // Also remove any conditions that this slug granted
    this.removeGranteesOf(slug)
  }

  /** Remove conditions that were granted by a specific slug (cascading grant removal).
   *  Only removes a grantee if it was granted by this slug (not independently applied). */
  private removeGranteesOf(slug: ConditionSlug): void {
    const toRemove: ConditionSlug[] = []
    for (const [grantee, granter] of this.grantedBy) {
      if (granter === slug) {
        toRemove.push(grantee)
      }
    }
    for (const grantee of toRemove) {
      this.grantedBy.delete(grantee)
      this.conditions.delete(grantee)
      this.durations.delete(grantee)
      this.protected_.delete(grantee)
      // Recursively remove anything THAT condition granted
      this.removeGranteesOf(grantee)
    }
  }

  /** Apply GrantItem effects for a condition (D-05). Uses depth counter to allow
   *  nested grant chains (dying->unconscious->blinded+off-guard+prone) while
   *  guarding against unexpected cycles. */
  private applyGrantsFor(slug: ConditionSlug): void {
    if (this.grantDepth > 5) return  // safety limit against unexpected cycles
    const effects = CONDITION_EFFECTS[slug]
    if (!effects) return
    this.grantDepth++
    try {
      for (const effect of effects) {
        if (effect.type === 'grant') {
          for (const grantedSlug of (effect as ConditionGrantEffect).grants) {
            // Only grant if not already present (independently or via another grant)
            if (!this.conditions.has(grantedSlug)) {
              this.grantedBy.set(grantedSlug, slug)
              this.conditions.set(grantedSlug, 1)
              // Recursively apply the granted condition's own grants
              // e.g., dying grants unconscious, then unconscious grants blinded+off-guard+prone
              this.applyGrantsFor(grantedSlug)
            }
          }
        }
      }
    } finally {
      this.grantDepth--
    }
  }
}
