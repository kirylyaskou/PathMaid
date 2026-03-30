import { CONDITION_SLUGS, VALUED_CONDITIONS, type ConditionSlug } from '@/lib/pf2e'

export type { ConditionSlug }
export { CONDITION_SLUGS }

export interface ConditionDef {
  slug: ConditionSlug
  badgeClass: string
  category: string
}

export function conditionHasValue(slug: ConditionSlug): boolean {
  return (VALUED_CONDITIONS as readonly string[]).includes(slug)
}

/**
 * Format a condition slug into a display name.
 * e.g. 'off-guard' → 'Off Guard', 'persistent-damage' → 'Persistent Damage'
 */
export function formatCondition(slug: ConditionSlug): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Categorized condition picker groups for the picker popover.
 * 7 sections covering all 44 PF2e conditions from CONDITION_SLUGS.
 */
export const PICKER_CATEGORIES: Record<string, ConditionSlug[]> = {
  'Detection':   ['observed', 'hidden', 'undetected', 'unnoticed', 'concealed', 'invisible'],
  'Attitudes':   ['hostile', 'unfriendly', 'indifferent', 'friendly', 'helpful'],
  'Movement':    ['slowed', 'quickened', 'immobilized', 'grabbed', 'restrained', 'encumbered', 'prone'],
  'Mental':      ['frightened', 'confused', 'fascinated', 'controlled', 'fleeing', 'stupefied'],
  'Physical':    ['blinded', 'dazzled', 'deafened', 'clumsy', 'enfeebled', 'drained', 'fatigued', 'sickened'],
  'Combat':      ['stunned', 'paralyzed', 'unconscious', 'dying', 'wounded', 'doomed', 'broken', 'petrified'],
  'Other':       ['off-guard', 'cursebound', 'malevolence', 'persistent-damage'],
}

/**
 * Static badge class map — avoids Tailwind JIT dynamic class scanning failure.
 * Each entry is a complete set of Tailwind classes for the badge background + text.
 * DO NOT use template literal class construction (e.g., `bg-${color}-600`).
 * 44 entries — one per entry in CONDITION_SLUGS.
 */
export const CONDITION_BADGE_CLASSES: Record<ConditionSlug, string> = {
  // Crimson (debilitating)
  stunned:             'bg-crimson text-stone-100',
  paralyzed:           'bg-crimson text-stone-100',
  restrained:          'bg-crimson-dark text-stone-100',
  grabbed:             'bg-crimson-dark text-stone-200',
  dying:               'bg-crimson text-stone-100',
  doomed:              'bg-crimson-dark text-stone-100',
  drained:             'bg-crimson-dark text-stone-200',
  unconscious:         'bg-charcoal-500 border border-crimson text-stone-300',
  confused:            'bg-crimson text-stone-100',
  controlled:          'bg-crimson-dark text-stone-100',
  fleeing:             'bg-crimson text-stone-100',
  // Amber (movement)
  slowed:              'bg-amber-700 text-stone-100',
  encumbered:          'bg-amber-800 text-stone-100',
  immobilized:         'bg-amber-700 text-stone-100',
  prone:               'bg-amber-800 text-stone-100',
  clumsy:              'bg-amber-700 text-stone-100',
  enfeebled:           'bg-amber-800 text-stone-100',
  // Indigo (senses)
  blinded:             'bg-indigo-900 border border-indigo-500 text-indigo-200',
  dazzled:             'bg-indigo-900 border border-indigo-500 text-indigo-200',
  deafened:            'bg-indigo-900 border border-indigo-500 text-indigo-200',
  hidden:              'bg-indigo-900 border border-indigo-500 text-indigo-200',
  undetected:          'bg-indigo-900 border border-indigo-500 text-indigo-200',
  invisible:           'bg-indigo-900 border border-indigo-500 text-indigo-200',
  concealed:           'bg-indigo-900 border border-indigo-500 text-indigo-200',
  'off-guard':         'bg-indigo-900 border border-indigo-500 text-indigo-200',
  // Stone (physical)
  broken:              'bg-stone-600 text-stone-200',
  fatigued:            'bg-stone-600 text-stone-200',
  petrified:           'bg-stone-700 text-stone-200',
  wounded:             'bg-stone-600 text-stone-200',
  'persistent-damage': 'bg-stone-700 text-stone-200',
  // Emerald (attitudes)
  friendly:            'bg-emerald-800 text-stone-100',
  helpful:             'bg-emerald-800 text-stone-100',
  indifferent:         'bg-emerald-900 text-stone-100',
  unfriendly:          'bg-emerald-900 text-stone-100',
  hostile:             'bg-emerald-800 text-stone-100',
  // Teal (other)
  quickened:           'bg-teal-800 text-stone-100',
  frightened:          'bg-teal-800 text-stone-100',
  sickened:            'bg-teal-800 text-stone-100',
  stupefied:           'bg-teal-900 text-stone-100',
  fascinated:          'bg-teal-800 text-stone-100',
  cursebound:          'bg-teal-900 text-stone-100',
  malevolence:         'bg-teal-900 text-stone-100',
  observed:            'bg-teal-800 text-stone-100',
  unnoticed:           'bg-teal-900 text-stone-100',
}
