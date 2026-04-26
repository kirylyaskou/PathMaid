/**
 * Non-React locale resolver — for API/store layers that cannot call useTranslation.
 *
 * Reads from the global i18next singleton (the same one bound by useTranslation).
 * Single source of truth: mirror of useCurrentLocale's resolution chain.
 */

import i18n from 'i18next'
import { isSupportedLocale, type SupportedLocale, FALLBACK_LOCALE } from './config'

export function getCurrentLocale(): SupportedLocale {
  const raw = i18n.resolvedLanguage ?? i18n.language ?? FALLBACK_LOCALE
  const base = raw.split('-')[0]
  return isSupportedLocale(base) ? base : FALLBACK_LOCALE
}
