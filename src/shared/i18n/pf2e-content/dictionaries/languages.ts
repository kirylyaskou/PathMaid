/**
 * Creature language dictionary — Foundry kebab-case slug to localized label.
 *
 * Source: `PF2E.Actor.Creature.Language.*` (174 keys). The namespace mixes
 * slug-keyed entries with uppercase UI-template keys (`CommonLanguage` =
 * "Всеобщий ({language})", `Plural` = "Языки", `DetailsPlaceholder`).
 * Without the `^[a-z]` filter, a lookup for one of those keys would render
 * a template fragment as if it were a language name — extraction drops
 * uppercase keys, leaving 171 slug-keyed entries.
 *
 * Known gap: the upstream community module does not cover several core
 * PF2e languages (infernal, sylvan, undercommon, celestial). The slug
 * fallback keeps rendering safe; surfacing the gap visually is the
 * untranslated-badge UI layer's responsibility, not this getter's.
 *
 * Getter contract:
 *   - locale='en' → echoes slug (engine canonical EN)
 *   - locale='ru' → looks up RU map; silent slug fallback when missing
 *     (production build emits no console.warn per INGEST-05)
 *
 * Source: vendor/pf2e-locale-ru/pf2e/pf2e.json
 * Vendor metadata: vendor/pf2e-locale-ru/VERSION.txt
 */

import pf2eJson from '@vendor/pf2e-locale-ru/pf2e/pf2e.json'
import type { SupportedLocale } from '@/shared/i18n/config'

const ROOT = (pf2eJson as { PF2E: Record<string, unknown> }).PF2E
const LANGUAGE_NAMESPACE = (
  (ROOT.Actor as Record<string, unknown>).Creature as {
    Language: Record<string, string>
  }
).Language

const LANGUAGE_LABELS_RU: Record<string, string> = {}
for (const [key, value] of Object.entries(LANGUAGE_NAMESPACE)) {
  if (/^[a-z]/.test(key)) {
    LANGUAGE_LABELS_RU[key] = value
  }
}

export function getLanguageLabel(slug: string, locale: SupportedLocale): string {
  if (locale === 'en') return slug
  return LANGUAGE_LABELS_RU[slug] ?? slug
}
