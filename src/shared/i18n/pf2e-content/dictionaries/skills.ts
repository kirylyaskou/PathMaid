/**
 * PF2e skill dictionary — engine PascalCase slug to localized label.
 *
 * 17 core PF2e skills: 16 from `PF2E.Skill.*` plus Lore. Lore lives at the
 * top level (`PF2E.SkillLore`) in the upstream community module rather than
 * inside the Skill namespace, so a naive `PF2E.Skill['Lore']` lookup would
 * return undefined; this module promotes Lore explicitly.
 *
 * The upstream community module covers PF2e and SF2e in a single JSON.
 * `Computers` and `Piloting` (SF2e) are present in `PF2E.Skill.*` but
 * PathMaid is PF2e-only — they are filtered out by the allowlist. The
 * engine should never emit those slugs, but the slug fallback keeps
 * rendering safe even if it does.
 *
 * Getter contract:
 *   - Strict PascalCase. `creature.skills[].name` is the canonical engine
 *     source. Lowercase or mis-cased slugs silently fall back to slug.
 *   - locale='en' → slug echoed (engine values already canonical EN)
 *   - locale='ru' → lookup in RU map; silent slug fallback when missing
 *     (production build emits no console.warn per INGEST-05)
 *
 * Lore family: the getter returns the base label "Знания". Per-character
 * specialty (e.g. "Boats Lore") is a UI-layer concern.
 *
 * Source: vendor/pf2e-locale-ru/pf2e/pf2e.json
 * Vendor metadata: vendor/pf2e-locale-ru/VERSION.txt
 */

import pf2eJson from '@vendor/pf2e-locale-ru/pf2e/pf2e.json'
import type { SupportedLocale } from '@/shared/i18n/config'

const ROOT = (pf2eJson as { PF2E: Record<string, unknown> }).PF2E
const SKILL_NAMESPACE = ROOT.Skill as Record<string, string>
const LORE_LABEL = ROOT.SkillLore as string

const SKILL_ALLOWLIST = [
  'Acrobatics',
  'Arcana',
  'Athletics',
  'Crafting',
  'Deception',
  'Diplomacy',
  'Intimidation',
  'Medicine',
  'Nature',
  'Occultism',
  'Performance',
  'Religion',
  'Society',
  'Stealth',
  'Survival',
  'Thievery',
  'Lore',
] as const

const SKILL_ALLOWLIST_SET = new Set<string>(SKILL_ALLOWLIST)

const SKILL_LABELS_RU: Record<string, string> = {
  Acrobatics: SKILL_NAMESPACE.Acrobatics,
  Arcana: SKILL_NAMESPACE.Arcana,
  Athletics: SKILL_NAMESPACE.Athletics,
  Crafting: SKILL_NAMESPACE.Crafting,
  Deception: SKILL_NAMESPACE.Deception,
  Diplomacy: SKILL_NAMESPACE.Diplomacy,
  Intimidation: SKILL_NAMESPACE.Intimidation,
  Medicine: SKILL_NAMESPACE.Medicine,
  Nature: SKILL_NAMESPACE.Nature,
  Occultism: SKILL_NAMESPACE.Occultism,
  Performance: SKILL_NAMESPACE.Performance,
  Religion: SKILL_NAMESPACE.Religion,
  Society: SKILL_NAMESPACE.Society,
  Stealth: SKILL_NAMESPACE.Stealth,
  Survival: SKILL_NAMESPACE.Survival,
  Thievery: SKILL_NAMESPACE.Thievery,
  Lore: LORE_LABEL,
}

export function getSkillLabel(slug: string, locale: SupportedLocale): string {
  if (locale === 'en') return slug
  if (!SKILL_ALLOWLIST_SET.has(slug)) return slug
  return SKILL_LABELS_RU[slug] ?? slug
}
