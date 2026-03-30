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

// Source: AON Conditions.aspx — Detection and Attitudes groupings
// Source: Foundry VTT PF2e DetectionConditionType type (observed, hidden, undetected, unnoticed)
export const CONDITION_GROUPS: Record<string, ConditionSlug[]> = {
  detection: ['observed', 'hidden', 'undetected', 'unnoticed'],
  attitudes:  ['hostile', 'unfriendly', 'indifferent', 'friendly', 'helpful'],
}

// ─── ConditionManager ─────────────────────────────────────────────────────────

export class ConditionManager {
  private readonly conditions = new Map<ConditionSlug, number>()
  private readonly durations = new Map<ConditionSlug, number>()
  private readonly protected_ = new Set<ConditionSlug>()

  add(slug: ConditionSlug, value = 1): void {
    // Enforce group exclusivity: remove all other members in slug's group
    for (const [, members] of Object.entries(CONDITION_GROUPS)) {
      if (members.includes(slug)) {
        for (const member of members) {
          if (member !== slug) this.conditions.delete(member)
        }
        break
      }
    }
    // Source: AON dying condition page — "When you gain the dying condition, you must
    //         add your wounded value to the dying value you gain."
    if (slug === 'dying') {
      const wounded = this.conditions.get('wounded') ?? 0
      this.conditions.set('dying', value + wounded)
      return
    }
    // Set condition value (valued conditions use provided value; boolean use 1)
    this.conditions.set(slug, value)
  }

  remove(slug: ConditionSlug): void {
    if (!this.conditions.has(slug)) return
    this.conditions.delete(slug)
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
}
