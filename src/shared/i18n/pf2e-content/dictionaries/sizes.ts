/**
 * Creature size dictionary — engine slug to localized label.
 *
 * Engine canonical slug list (`tiny | sm | med | lg | huge | grg`) maps onto
 * the 6 `PF2E.ActorSize*` keys in the vendored locale module. The engine
 * size list is stable (see CreatureSize union in engine/types.ts) so the
 * mapping lives inline rather than scanning at runtime.
 *
 * Getter contract:
 *   - locale='en' → echoes the slug as-is (engine values already canonical)
 *   - locale='ru' → looks up pf2e.json; silent slug fallback when missing
 *     (production build emits no console.warn per INGEST-05)
 *
 * Source: vendor/pf2e-locale-ru/pf2e/pf2e.json
 * Vendor metadata: vendor/pf2e-locale-ru/VERSION.txt
 */

import pf2eJson from '@vendor/pf2e-locale-ru/pf2e/pf2e.json'
import type { SupportedLocale } from '@/shared/i18n/config'

const ROOT = (pf2eJson as { PF2E: Record<string, unknown> }).PF2E
const STRINGS = ROOT as Record<string, string>

const SIZE_KEY_BY_ENGINE: Record<string, string> = {
  tiny: 'ActorSizeTiny',
  sm: 'ActorSizeSmall',
  med: 'ActorSizeMedium',
  lg: 'ActorSizeLarge',
  huge: 'ActorSizeHuge',
  grg: 'ActorSizeGargantuan',
}

export function getSizeLabel(slug: string, locale: SupportedLocale): string {
  if (locale === 'en') return slug
  const key = SIZE_KEY_BY_ENGINE[slug]
  if (!key) return slug
  return STRINGS[key] ?? slug
}
