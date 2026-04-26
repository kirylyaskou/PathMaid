/**
 * Trait dictionary — Foundry kebab-case slug to localized label and description.
 *
 * Source: top-level `PF2E.*` keys in pf2e.json. The upstream module stores
 * ~890 trait labels under `Trait<PascalCase>` keys and ~500 descriptions
 * under `TraitDescription<PascalCase>`. UI strings such as `Traits` and
 * `TraitsLabel` (no capitalized suffix beyond the prefix) are excluded by
 * the regex.
 *
 * Naming: PascalCase suffix → lowercase kebab-case via a two-step regex
 * (separator before each capital + acronym-aware boundary). Engine traits
 * are lowercase kebab (see engine/types.ts: `traits: string[]`, examples
 * include 'humanoid', 'serpentfolk').
 *
 * Numbered variants: `TraitAdditive0..3` produce slugs `additive-0..3`.
 * Bare `TraitAdditive` also exists and resolves to `additive`. Any trait
 * whose actual Foundry slug does not match the derived kebab silently
 * falls back to slug.
 *
 * Getter contracts:
 *   - getTraitLabel(slug, locale)
 *       locale='en' → echoes slug
 *       locale='ru' → Map lookup; silent slug fallback when missing
 *                     (production build emits no console.warn)
 *   - getTraitDescription(slug, locale): string | null
 *       locale='en' → null (EN canonical descriptions not covered)
 *       locale='ru' → Map lookup; null when missing (UI hides tooltip)
 *
 * Performance: extraction is one Object.entries pass at module init;
 * getter calls are O(1) Map lookups with no allocation.
 *
 * Source: vendor/pf2e-locale-ru/pf2e/pf2e.json
 * Vendor metadata: vendor/pf2e-locale-ru/VERSION.txt
 */

import pf2eJson from '@vendor/pf2e-locale-ru/pf2e/pf2e.json'
import type { SupportedLocale } from '@/shared/i18n/config'

function pascalToKebab(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

const ROOT = (pf2eJson as { PF2E: Record<string, unknown> }).PF2E

const TRAIT_LABELS = new Map<string, string>()
const TRAIT_DESCRIPTIONS = new Map<string, string>()

for (const [key, value] of Object.entries(ROOT)) {
  if (typeof value !== 'string') continue
  const descMatch = /^TraitDescription([A-Z].*)$/.exec(key)
  if (descMatch) {
    TRAIT_DESCRIPTIONS.set(pascalToKebab(descMatch[1]), value)
    continue
  }
  const labelMatch = /^Trait([A-Z].*)$/.exec(key)
  if (labelMatch) {
    TRAIT_LABELS.set(pascalToKebab(labelMatch[1]), value)
  }
}

// Augment with categories that don't live under the `Trait*` flat namespace
// but still feed UI labels: area shapes (cone/emanation/burst/cube/cylinder/line),
// save types (fortitude/reflex/will), and weapon groups. Engine emits these
// as kebab/lowercase slugs identical to the JSON keys, so a flat lookup wins.
const AREA_SHAPES = (ROOT as { Area?: { Shape?: Record<string, string> } }).Area?.Shape
if (AREA_SHAPES) {
  for (const [k, v] of Object.entries(AREA_SHAPES)) {
    if (typeof v === 'string' && !TRAIT_LABELS.has(k)) {
      TRAIT_LABELS.set(k.toLowerCase(), v)
    }
  }
}

// Save type labels surfaced on stat blocks and spell cards. These are
// hand-curated because pf2e.json scatters them across `Check.DC.Specific`,
// `MasterSavingThrow`, and similar action-context namespaces with prefixes
// or possessives that don't fit a flat label slot.
const SAVE_LABELS_RU: Record<string, string> = {
  fortitude: 'Стойкость',
  reflex: 'Реакция',
  will: 'Воля',
}
for (const [k, v] of Object.entries(SAVE_LABELS_RU)) {
  if (!TRAIT_LABELS.has(k)) TRAIT_LABELS.set(k, v)
}

// Spellcasting cast-type labels (prepared/spontaneous/innate/focus/ritual)
// — used for the tradition pill on stat blocks. pf2e.json holds these
// only inside complex sentence templates ("Tradition.Prepared.Title")
// so easier to curate.
const CAST_TYPE_LABELS_RU: Record<string, string> = {
  prepared: 'подготовленный',
  spontaneous: 'спонтанный',
  innate: 'врождённый',
  focus: 'фокус',
  ritual: 'ритуал',
}
for (const [k, v] of Object.entries(CAST_TYPE_LABELS_RU)) {
  if (!TRAIT_LABELS.has(k)) TRAIT_LABELS.set(k, v)
}

// Damage / IWR types missing from the `Trait*` namespace but emitted by
// the engine (Foundry stores them as plain strings, not traits). These
// surface on weakness/resistance lines, strike damage labels, and spell
// damage rows.
const DAMAGE_TYPE_LABELS_RU: Record<string, string> = {
  bludgeoning: 'дробящий',
  piercing: 'колющий',
  slashing: 'рубящий',
  acid: 'кислота',
  cold: 'холод',
  electricity: 'электричество',
  fire: 'огонь',
  sonic: 'звук',
  poison: 'яд',
  mental: 'ментальный',
  void: 'пустота',
  vitality: 'жизненность',
  spirit: 'духовный',
  force: 'сила',
  precision: 'точность',
  bleed: 'кровотечение',
  positive: 'позитивный',
  negative: 'негативный',
  holy: 'сакральный',
  unholy: 'нечестивый',
  healing: 'лечение',
  // Material types
  'cold-iron': 'холодное железо',
  silver: 'серебро',
  adamantine: 'адамантин',
  orichalcum: 'орихалк',
  // Misc damage-row tokens
  untyped: 'без типа',
  splash: 'осколочный',
  // Senses
  darkvision: 'тёмное зрение',
  'low-light-vision': 'сумеречное зрение',
  scent: 'нюх',
  tremorsense: 'чувство колебаний',
  lifesense: 'чувство жизни',
}
for (const [k, v] of Object.entries(DAMAGE_TYPE_LABELS_RU)) {
  if (!TRAIT_LABELS.has(k)) TRAIT_LABELS.set(k, v)
}

// Weapon group labels — `spear`, `dart`, `sword`, … emitted by Foundry as
// `system.group` on weapon items. Live in `Weapon.Group.*` in pf2e.json
// under nested namespace; harvest flat.
const WEAPON_GROUPS = (ROOT as { Weapon?: { Group?: Record<string, string> } }).Weapon?.Group
if (WEAPON_GROUPS) {
  for (const [k, v] of Object.entries(WEAPON_GROUPS)) {
    if (typeof v === 'string' && !TRAIT_LABELS.has(k.toLowerCase())) {
      TRAIT_LABELS.set(k.toLowerCase(), v)
    }
  }
}

export function getTraitLabel(slug: string, locale: SupportedLocale): string {
  if (locale === 'en') return slug
  return TRAIT_LABELS.get(slug) ?? slug
}

export function getTraitDescription(
  slug: string,
  locale: SupportedLocale,
): string | null {
  if (locale === 'en') return null
  return TRAIT_DESCRIPTIONS.get(slug) ?? null
}
