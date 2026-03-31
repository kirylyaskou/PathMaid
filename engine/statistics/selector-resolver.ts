// ─── Selector Resolver (D-11) ───────────────────────────────────────────────
// Maps condition effect selector strings to actual statistic slugs present
// on a specific creature. PF2e ability-to-skill mapping is hardcoded per rules.
//
// Per D-11: "dex-based" = Reflex + Dex skills + AC.
// Clumsy penalizes AC once via the dex-based selector. This is correct because
// NPC AC is a pre-calculated base value — the Clumsy status penalty is applied
// as a modifier overlay on top of that base value, just like any other condition.

import type { ConditionSelector } from '../conditions/condition-effects'

// PF2e ability-to-skill mapping (hardcoded per rules, not dynamic)
const DEX_SKILLS = ['acrobatics', 'stealth', 'thievery']
const STR_SKILLS = ['athletics']
// Note: No CON_SKILLS array — Fortitude is the only con-based statistic (a save, not a skill)
const INT_SKILLS = ['arcana', 'crafting', 'occultism', 'society']
const WIS_SKILLS = ['medicine', 'nature', 'religion', 'survival']
const CHA_SKILLS = ['deception', 'diplomacy', 'intimidation', 'performance']

/**
 * Resolve a ConditionSelector to an array of statistic slugs that exist
 * on the given creature's statistic keys.
 *
 * @param selector - A selector string or array of selector strings from CONDITION_EFFECTS
 * @param statisticKeys - All statistic slugs present on this creature (e.g., ['ac', 'fortitude', 'reflex', 'will', 'perception', 'athletics', 'stealth'])
 * @returns Array of statistic slugs that match the selector
 */
export function resolveSelector(
  selector: ConditionSelector,
  statisticKeys: string[],
): string[] {
  // Handle array selectors by resolving each and deduplicating
  if (Array.isArray(selector)) {
    const results = new Set<string>()
    for (const sel of selector) {
      for (const key of resolveSingleSelector(sel, statisticKeys)) {
        results.add(key)
      }
    }
    return Array.from(results)
  }
  return resolveSingleSelector(selector, statisticKeys)
}

function resolveSingleSelector(selector: string, statisticKeys: string[]): string[] {
  switch (selector) {
    case 'all':
      // All checks and DCs — return every statistic key
      return [...statisticKeys]

    case 'ac':
      return statisticKeys.filter(k => k === 'ac')

    case 'perception':
      return statisticKeys.filter(k => k === 'perception')

    case 'reflex':
      return statisticKeys.filter(k => k === 'reflex')

    case 'fortitude':
      return statisticKeys.filter(k => k === 'fortitude')

    case 'will':
      return statisticKeys.filter(k => k === 'will')

    case 'dex-based':
      // Per D-11: Reflex + Dex-governed skills + AC.
      // Clumsy penalizes AC via this selector — NPC AC base value gets
      // the status penalty as a modifier overlay.
      return statisticKeys.filter(k =>
        k === 'reflex' || k === 'ac' || DEX_SKILLS.includes(k)
      )

    case 'str-based':
      // Fortitude is Constitution-based in PF2e (not Str). Str-based = Athletics only + attack rolls.
      // For statistic purposes: Athletics + fortitude is debatable, but Foundry applies str-based
      // to Athletics only. Fortitude is con-based.
      return statisticKeys.filter(k =>
        STR_SKILLS.includes(k)
      )

    case 'str-damage':
      // Damage modifier, not a statistic key — handled separately by damage system
      return []

    case 'con-based':
      // Fortitude save + Con checks
      return statisticKeys.filter(k => k === 'fortitude')

    case 'int-based':
      return statisticKeys.filter(k => INT_SKILLS.includes(k))

    case 'wis-based':
      // Wisdom skills + Perception (Perception is Wis-based in PF2e)
      return statisticKeys.filter(k =>
        k === 'perception' || WIS_SKILLS.includes(k)
      )

    case 'cha-based':
      return statisticKeys.filter(k => CHA_SKILLS.includes(k))

    default:
      // Unknown selector — try exact match against statistic keys
      return statisticKeys.filter(k => k === selector)
  }
}
