// ─── Condition Modifier Computation (Phase 39) ───────────────────────────────
// Layer 1: resolves which active conditions apply to a specific stat slug,
// then uses StatisticModifier (Layer 2) to apply stacking rules and sum.
//
// Extended in Phase 56 to also accept spell effect FlatModifier inputs,
// feeding them into the same stacking rules pass as condition modifiers.
//
// Used by: src/entities/creature/model/use-modified-stats.ts (React hook layer)
// Does NOT import from React or any UI layer.

import { Modifier, StatisticModifier } from '../modifiers/modifiers'
import { CONDITION_EFFECTS } from '../conditions/condition-effects'
import { resolveSelector } from './selector-resolver'
import type { ConditionModifierEffect } from '../conditions/condition-effects'
import type { ConditionSlug } from '../conditions/conditions'
import type { SpellEffectModifierInput } from '../effects/spell-effect-modifiers'

// ─── Public Types ─────────────────────────────────────────────────────────────

/** Active condition input — matches the shape in Zustand useConditionStore. */
export interface ConditionInput {
  slug: ConditionSlug
  value: number // 1 for non-valued conditions; actual value for valued (e.g., frightened=2)
}

/**
 * Result of computeStatModifier — net modifier + breakdown of enabled modifiers.
 * modifiers array contains ONLY enabled modifiers after stacking rules.
 * Use modifiers[] for tooltip breakdown, netModifier for display value delta.
 */
export interface StatModifierResult {
  netModifier: number // sum of enabled modifiers (negative = penalty, positive = bonus)
  modifiers: Modifier[] // enabled modifiers only, for tooltip breakdown
}

// ─── Core Function ────────────────────────────────────────────────────────────

/**
 * Compute the net condition modifier for a single stat slug.
 *
 * Internally uses CONDITION_EFFECTS + resolveSelector to find which conditions
 * target this stat, then StatisticModifier to apply stacking rules
 * (status penalties don't stack — only the worst applies).
 *
 * @param conditions - Active conditions for a combatant (slug + value)
 * @param statSlug   - The stat to compute modifiers for (e.g., 'ac', 'fortitude', 'strike-attack')
 * @param allStatSlugs - All stat slugs on this creature + any virtual slugs passed by caller.
 *   This universe is used by resolveSelector to expand 'all', 'dex-based', etc.
 *   Virtual slugs (e.g., 'strike-attack', 'spell-dc') are included here so that
 *   the 'all' selector picks them up. Ability-based selectors only pick up
 *   real skill slugs defined in selector-resolver.ts.
 *
 * @returns { netModifier, modifiers } — returns { 0, [] } if no conditions apply.
 */
export function computeStatModifier(
  conditions: ConditionInput[],
  statSlug: string,
  allStatSlugs: string[],
  spellEffects?: SpellEffectModifierInput[],
): StatModifierResult {
  const rawModifiers: Modifier[] = []

  for (const { slug, value } of conditions) {
    const effects = CONDITION_EFFECTS[slug]
    if (!effects) continue

    for (const effect of effects) {
      if (effect.type !== 'modifier') continue
      const modEffect = effect as ConditionModifierEffect

      // Resolve which stats this effect targets on this creature
      const targetSlugs = resolveSelector(modEffect.selector, allStatSlugs)
      if (!targetSlugs.includes(statSlug)) continue

      // Compute modifier value: fixed effects ignore condition level
      const modValue = modEffect.fixed
        ? modEffect.valuePerLevel
        : modEffect.valuePerLevel * value

      // Label: "Frightened 2" for valued, "Off-Guard" for fixed/non-valued
      const label =
        !modEffect.fixed && value > 1
          ? `${formatConditionLabel(slug)} ${value}`
          : formatConditionLabel(slug)

      rawModifiers.push(
        new Modifier({
          slug: `${slug}:${statSlug}`,
          label,
          modifier: modValue,
          type: modEffect.modifierType,
        }),
      )
    }
  }

  // ── Spell Effect FlatModifier ────────────────────────────────────────────
  // Fed into the same rawModifiers array so StatisticModifier applies stacking
  // rules across both conditions and spell effects in a single pass.
  // A +2 status bonus from Shield and a -2 status penalty from Frightened 2
  // correctly cancel out because they share the 'status' typed bucket.
  if (spellEffects) {
    for (const effect of spellEffects) {
      const targetSlugs = resolveSelector(effect.selector, allStatSlugs)
      if (!targetSlugs.includes(statSlug)) continue

      rawModifiers.push(
        new Modifier({
          slug: `effect:${effect.effectId}:${statSlug}`,
          label: effect.effectName,
          modifier: effect.value,
          type: effect.modifierType,
        }),
      )
    }
  }

  if (rawModifiers.length === 0) return { netModifier: 0, modifiers: [] }

  // StatisticModifier applies stacking rules: only worst status penalty,
  // only best status bonus, all untyped stack
  const sm = new StatisticModifier(statSlug, rawModifiers)
  return {
    netModifier: sm.totalModifier,
    modifiers: sm.modifiers.filter((m) => m.enabled),
  }
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/** Format a condition slug as a display label. "off-guard" → "Off-Guard" */
function formatConditionLabel(slug: ConditionSlug): string {
  return (slug as string)
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('-')
}
