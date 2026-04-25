/**
 * i18next initialization for PathMaid.
 *
 * Usage:
 *   // In app entry (providers.tsx):
 *   import '@/shared/i18n'   // side-effect import to ensure init
 *
 *   // In any component:
 *   import { useTranslation } from 'react-i18next'
 *   const { t } = useTranslation()
 *   t('nav.dashboard')
 *
 * Persistence: locale change fires an event handler that writes to localStorage.
 * On init we read the persisted value to restore across restarts.
 *
 * Rationale for no `i18next-browser-languagedetector`:
 *   - one more dep vs ~10 lines of storage sync
 *   - Tauri WebView has a single consistent localStorage; no HTTP header/cookie
 *     detection needed
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enCommon from './locales/en/common.json'
import ruCommon from './locales/ru/common.json'
import {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  SUPPORTED_LOCALES,
  type SupportedLocale,
  readPersistedLocale,
  writePersistedLocale,
} from './config'

void i18n.use(initReactI18next).init({
  resources: {
    en: { common: enCommon },
    ru: { common: ruCommon },
  },
  lng: readPersistedLocale(),
  fallbackLng: FALLBACK_LOCALE,
  defaultNS: 'common',
  ns: ['common'],
  supportedLngs: [...SUPPORTED_LOCALES],
  interpolation: {
    escapeValue: false, // React already escapes
  },
  returnNull: false,
})

// Persist locale when it changes
i18n.on('languageChanged', (lng) => {
  // The lng arg from i18next may include region (e.g. 'en-US'); normalize to base.
  const base = (lng?.split('-')[0] ?? DEFAULT_LOCALE) as SupportedLocale
  if ((SUPPORTED_LOCALES as readonly string[]).includes(base)) {
    writePersistedLocale(base)
  }
})

export { i18n }
export * from './config'
export type { TranslationKind } from './pf2e-content'
export type { MonsterStructuredLoc, AbilityLoc } from './pf2e-content/lib'
export {
  loadContentTranslations,
  getMonsterTranslation,
  getSizeLabel,
  getSkillLabel,
  getLanguageLabel,
  getTraitLabel,
  getTraitDescription,
} from './pf2e-content'
export { useContentTranslation } from './use-content-translation'
