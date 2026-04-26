/**
 * React hook for the current i18next locale with type-safe fallback.
 *
 * Contract:
 *   - reads `i18n.resolvedLanguage` first (already fallback-resolved by
 *     i18next), then `i18n.language` (raw user setting), then 'en'
 *   - normalises region-suffixed tags ('en-US' → 'en') via split('-')[0]
 *   - guards the result through isSupportedLocale; unsupported tags fall
 *     back to 'en'
 *
 * Single source of truth for UI consumers of the dictionary getter API
 * (getTraitLabel / getSkillLabel / getLanguageLabel / getSizeLabel /
 * getTraitDescription). Re-rendering on locale change is provided by
 * useTranslation()'s reactive subscription.
 */

import { useTranslation } from 'react-i18next'
import { isSupportedLocale, type SupportedLocale } from './config'

export function useCurrentLocale(): SupportedLocale {
  const { i18n } = useTranslation()
  const base = (i18n.resolvedLanguage ?? i18n.language ?? 'en').split('-')[0]
  return isSupportedLocale(base) ? base : 'en'
}
