// ─── Statistic Class (D-08) ─────────────────────────────────────────────────
// Base value + modifier overlay model. Effective value = baseValue + totalModifier.
// Uses existing applyStackingRules() and StatisticModifier — does NOT reimplement stacking.

import { Modifier, StatisticModifier } from '../modifiers/modifiers'

export class Statistic {
  readonly slug: string
  readonly label: string
  readonly baseValue: number
  private modifiers_: Modifier[] = []

  constructor(slug: string, baseValue: number, label?: string) {
    this.slug = slug
    this.baseValue = baseValue
    this.label = label ?? slug
  }

  /** Add a modifier to this statistic. Source-prefixed slug enables batch removal. */
  addModifier(mod: Modifier): void {
    this.modifiers_.push(mod)
  }

  /**
   * Remove all modifiers whose slug starts with the given source prefix.
   * Convention: condition modifiers use slug format "conditionSlug:selectorTarget"
   * e.g., "frightened:ac", "off-guard:ac".
   * Calling removeModifiersBySource('frightened') removes all frightened modifiers.
   */
  removeModifiersBySource(source: string): void {
    this.modifiers_ = this.modifiers_.filter(m => !m.slug.startsWith(source + ':'))
  }

  /** Returns a snapshot of current modifiers (copies for safety). */
  get modifiers(): readonly Modifier[] {
    return this.modifiers_
  }

  /**
   * Computes totalModifier by running applyStackingRules on a fresh copy.
   * Recomputed on each call — no stale cache (anti-pattern from research).
   */
  get totalModifier(): number {
    const stat = new StatisticModifier(this.slug, [...this.modifiers_])
    return stat.totalModifier
  }

  /** Effective value: base + all applicable modifiers after stacking rules. */
  get value(): number {
    return this.baseValue + this.totalModifier
  }
}
