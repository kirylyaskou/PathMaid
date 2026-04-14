// ─── Spell Effect Modifier Parser (Phase 56, D-05, D-06, D-07, D-08) ──────────
// Parses FlatModifier and Resistance rule elements from spell effect rules_json.
// Only processes numeric FlatModifier values — skips @item.badge.value and similar
// dynamic references that cannot be resolved without a live actor context (D-08).
//
// Predicates are stored but NOT evaluated — this engine layer has no actor context
// to resolve predicate expressions against. Predicates are stored for future use
// if actor-context evaluation is added (D-07).

import type { ModifierType } from '../modifiers/modifiers'

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * A parsed FlatModifier rule element from a spell effect's rules_json.
 * Represents a single modifier contribution to a stat selector.
 */
export interface SpellEffectModifierInput {
  effectId: string        // for slug uniqueness (e.g., 'shield:ac')
  effectName: string      // human-readable label (e.g., 'Shield')
  selector: string | string[]
  modifierType: ModifierType  // 'status' | 'circumstance' | 'item' | 'untyped'
  value: number               // numeric value only
  predicate?: unknown[]       // stored but NOT evaluated (D-07)
}

// ─── FlatModifier Parser ──────────────────────────────────────────────────────

/**
 * Parse FlatModifier rule elements from a spell effect's rules_json string.
 *
 * Skips:
 * - Non-numeric values (e.g., `@item.badge.value`) — cannot resolve without actor context
 * - Rules where key !== 'FlatModifier'
 * - Rules without a selector
 * - Malformed JSON
 *
 * @param rulesJson   - The rules_json string from encounter_combatant_effects
 * @param effectId    - Effect ID for unique slug generation
 * @param effectName  - Human-readable name for modifier label
 * @returns Array of parsed SpellEffectModifierInput entries, empty on parse failure
 */
export function parseSpellEffectModifiers(
  rulesJson: string,
  effectId: string,
  effectName: string,
): SpellEffectModifierInput[] {
  let rules: unknown[]
  try {
    rules = JSON.parse(rulesJson)
  } catch {
    return []
  }
  if (!Array.isArray(rules)) return []

  const result: SpellEffectModifierInput[] = []
  for (const rule of rules) {
    const r = rule as Record<string, unknown>
    if (r.key !== 'FlatModifier') continue
    if (typeof r.value !== 'number') continue  // skip @item.badge.value etc. (Pitfall 1 / D-08)
    const selector = r.selector as string | string[] | undefined
    if (!selector) continue

    result.push({
      effectId,
      effectName,
      selector,
      modifierType: (r.type as ModifierType) ?? 'untyped',
      value: r.value as number,
      predicate: Array.isArray(r.predicate) ? r.predicate : undefined,
    })
  }
  return result
}

// ─── Resistance Parser ────────────────────────────────────────────────────────

/**
 * Parse Resistance rule elements from a spell effect's rules_json string.
 *
 * Returns `{ type, value }` tuples — consumer merges with base creature resistances
 * using take-max-per-type strategy (see mergeResistances in entities/spell-effect).
 *
 * @param rulesJson - The rules_json string from encounter_combatant_effects
 * @returns Array of { type, value } resistance entries, empty on parse failure
 */
export function parseSpellEffectResistances(
  rulesJson: string,
): { type: string; value: number }[] {
  let rules: unknown[]
  try {
    rules = JSON.parse(rulesJson)
  } catch {
    return []
  }
  if (!Array.isArray(rules)) return []

  return rules
    .filter((r) => (r as Record<string, unknown>).key === 'Resistance')
    .map((r) => {
      const rec = r as Record<string, unknown>
      return { type: String(rec.type ?? ''), value: Number(rec.value ?? 0) }
    })
    .filter((r) => r.type && r.value > 0)
}
