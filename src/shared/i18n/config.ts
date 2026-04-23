/**
 * i18n configuration — supported locales and persistence key.
 *
 * The set of supported locales is intentionally narrow (EN + RU) for v1.5.1.
 * Adding a locale requires: new `locales/<code>/common.json`, adding the code
 * here, and shipping translations for any content JSON (pf2e-content/*).
 */

export const SUPPORTED_LOCALES = ['en', 'ru'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: SupportedLocale = 'en'
export const FALLBACK_LOCALE: SupportedLocale = 'en'

export const LOCALE_STORAGE_KEY = 'pathmaid_locale'

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: 'English',
  ru: 'Русский',
}

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return (
    typeof value === 'string' &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  )
}

/**
 * Read persisted locale from localStorage with graceful fallback.
 * Safe to call during SSR-like contexts (e.g., tests) — returns default.
 */
export function readPersistedLocale(): SupportedLocale {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (isSupportedLocale(raw)) return raw
  } catch {
    /* noop — localStorage unavailable */
  }
  return DEFAULT_LOCALE
}

export function writePersistedLocale(locale: SupportedLocale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    /* noop — storage full or disabled */
  }
}
