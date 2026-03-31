// ─── Creature Statistics Adapter (D-08, D-09, D-10, D-11, D-14) ─────────────
// Wraps a Creature's base stat block values as Statistic instances and
// auto-injects/ejects condition modifiers when conditions change.
// Uses Option B from Research Open Question #1: CreatureStatistics adapter
// keeps ConditionManager decoupled from statistics.

import { Modifier, StatisticModifier } from '../modifiers/modifiers'
import { Statistic } from './statistic'
import { resolveSelector } from './selector-resolver'
import { CONDITION_EFFECTS } from '../conditions/condition-effects'
import type { ConditionModifierEffect } from '../conditions/condition-effects'
import type { ConditionSlug } from '../conditions/conditions'
import type { Creature, CreatureAttack } from '../types'

export class CreatureStatistics {
  /** All statistics on this creature, keyed by slug (ac, fortitude, reflex, will, perception, athletics, etc.) */
  readonly statistics: Map<string, Statistic>
  private readonly creature: Creature

  constructor(creature: Creature) {
    this.creature = creature
    this.statistics = new Map()

    // Populate from creature base values (D-08, D-09)
    this.statistics.set('ac', new Statistic('ac', creature.ac, 'AC'))
    this.statistics.set('fortitude', new Statistic('fortitude', creature.saves.fortitude, 'Fortitude'))
    this.statistics.set('reflex', new Statistic('reflex', creature.saves.reflex, 'Reflex'))
    this.statistics.set('will', new Statistic('will', creature.saves.will, 'Will'))
    this.statistics.set('perception', new Statistic('perception', creature.perception, 'Perception'))

    // Sparse skills — only those present on the creature (Pitfall 5)
    for (const [skillSlug, baseValue] of Object.entries(creature.skills)) {
      this.statistics.set(skillSlug, new Statistic(skillSlug, baseValue, skillSlug))
    }

    // Initiative (typically equals perception for NPCs)
    this.statistics.set('initiative', new Statistic('initiative', creature.initiative, 'Initiative'))

    // Apply modifiers for any conditions already active on the creature
    this.syncAllConditions()

    // Populate attack.mapSets for each attack (per D-14)
    this.rebuildAllAttackMapSets()
  }

  /** Get a statistic by slug. Returns undefined if the creature doesn't have it. */
  get(slug: string): Statistic | undefined {
    return this.statistics.get(slug)
  }

  /** Get all statistic slugs present on this creature. */
  get keys(): string[] {
    return Array.from(this.statistics.keys())
  }

  // ─── Condition Auto-Injection (D-10) ────────────────────────────────────

  /**
   * Call after ConditionManager.add() to inject the new condition's modifiers
   * into all affected statistics.
   *
   * @param slug - The condition slug that was just added
   * @param value - The condition value (for valued conditions like frightened 2)
   */
  onConditionAdded(slug: ConditionSlug, value: number): void {
    this.injectConditionModifiers(slug, value)
    this.rebuildAllAttackMapSets()
  }

  /**
   * Call after ConditionManager.remove() to eject the removed condition's
   * modifiers from all statistics.
   *
   * @param slug - The condition slug that was just removed
   */
  onConditionRemoved(slug: ConditionSlug): void {
    this.ejectConditionModifiers(slug)
    this.rebuildAllAttackMapSets()
  }

  /**
   * Call when a valued condition changes value (e.g., frightened 2 -> frightened 1
   * at end of turn). Ejects old modifiers and injects new ones.
   *
   * @param slug - The condition slug whose value changed
   * @param newValue - The new condition value
   */
  onConditionValueChanged(slug: ConditionSlug, newValue: number): void {
    this.ejectConditionModifiers(slug)
    if (newValue > 0) {
      this.injectConditionModifiers(slug, newValue)
    }
    this.rebuildAllAttackMapSets()
  }

  /**
   * Resync all condition modifiers from the creature's ConditionManager.
   * Useful after bulk condition changes or initialization.
   */
  syncAllConditions(): void {
    // First, eject all condition modifiers
    const effects = CONDITION_EFFECTS
    for (const condSlug of Object.keys(effects)) {
      this.ejectConditionModifiers(condSlug as ConditionSlug)
    }

    // Then inject for all active conditions
    for (const { slug, value } of this.creature.conditions.getAll()) {
      this.injectConditionModifiers(slug, value)
    }
  }

  // ─── MAP Attack Modifier Sets (D-14) ───────────────────────────────────

  /**
   * Rebuild mapSets on all creature attacks. Called after condition changes
   * to keep attack modifier sets in sync with current condition modifiers.
   */
  private rebuildAllAttackMapSets(): void {
    // Gather condition modifiers that affect attack rolls
    // (Attack rolls are typically affected by conditions targeting 'all' or specific attack modifiers)
    // For now, we pass no extra condition modifiers — the attack bonus base value
    // already has the creature's base attack bonus. Condition modifiers affecting
    // attack rolls would need a separate selector (future enhancement).
    for (const attack of this.creature.attacks) {
      attack.mapSets = buildAttackModifierSets(attack)
    }
  }

  // ─── Private Injection Helpers ──────────────────────────────────────────

  private injectConditionModifiers(slug: ConditionSlug, value: number): void {
    const effects = CONDITION_EFFECTS[slug]
    if (!effects) return

    const statisticKeys = this.keys

    for (const effect of effects) {
      if (effect.type !== 'modifier') continue
      const modEffect = effect as ConditionModifierEffect

      // Compute modifier value: fixed effects ignore condition value
      const modValue = modEffect.fixed
        ? modEffect.valuePerLevel
        : modEffect.valuePerLevel * value

      // Resolve which statistics this selector targets
      const targetSlugs = resolveSelector(modEffect.selector, statisticKeys)

      for (const targetSlug of targetSlugs) {
        const statistic = this.statistics.get(targetSlug)
        if (!statistic) continue

        // Modifier slug format: "conditionSlug:targetSlug" for source-based removal
        const modifier = new Modifier({
          slug: `${slug}:${targetSlug}`,
          label: `${slug} (${modEffect.modifierType})`,
          modifier: modValue,
          type: modEffect.modifierType,
        })
        statistic.addModifier(modifier)
      }
    }
  }

  private ejectConditionModifiers(slug: ConditionSlug): void {
    for (const statistic of this.statistics.values()) {
      statistic.removeModifiersBySource(slug)
    }
  }
}

// ─── MAP Attack Modifier Sets (D-05, D-06, D-07) ──────────────────────────

/**
 * Build 3 StatisticModifier sets for a creature attack representing MAP positions.
 * Attack 1: MAP 0, Attack 2: MAP -5 (or -4 agile), Attack 3: MAP -10 (or -8 agile).
 *
 * MAP is an UNTYPED modifier (D-06) — it always stacks with other modifiers.
 * Agile trait (D-07) determines -4/-8 vs -5/-10 penalties.
 *
 * @param attack - The creature attack entry (name, bonus, traits)
 * @param conditionModifiers - Active condition modifiers affecting attack rolls
 *   (e.g., frightened -2 status, off-guard does NOT affect attacks).
 *   Caller is responsible for resolving which condition modifiers apply to attacks.
 * @returns Tuple of 3 StatisticModifier instances for attack positions 1, 2, 3
 */
export function buildAttackModifierSets(
  attack: CreatureAttack,
  conditionModifiers: Modifier[] = [],
): [StatisticModifier, StatisticModifier, StatisticModifier] {
  const isAgile = attack.traits.includes('agile')
  const mapPenalties = isAgile ? [0, -4, -8] : [0, -5, -10]

  return mapPenalties.map((penalty, idx) => {
    const mods: Modifier[] = [
      // Clone condition modifiers to avoid mutation across MAP positions
      ...conditionModifiers.map(m => new Modifier({
        slug: m.slug,
        label: m.label,
        modifier: m.modifier,
        type: m.type,
        enabled: m.enabled,
      })),
      // MAP penalty as untyped modifier (D-06 — must be untyped, see Pitfall 2)
      ...(penalty !== 0 ? [new Modifier({
        slug: `map-${idx + 1}`,
        label: `MAP (attack ${idx + 1})`,
        modifier: penalty,
        type: 'untyped',
      })] : []),
    ]

    return new StatisticModifier(
      `${attack.name.toLowerCase().replace(/\s+/g, '-')}-attack-${idx + 1}`,
      mods,
      `${attack.name} (attack ${idx + 1})`,
    )
  }) as [StatisticModifier, StatisticModifier, StatisticModifier]
}
