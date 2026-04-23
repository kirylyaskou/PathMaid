/**
 * React hook for looking up bundled content translations.
 *
 * Thin wrapper around `getTranslation()` that:
 *   - reads current locale from i18next (useTranslation())
 *   - short-circuits to null when locale === 'en' (no network, no DB round-trip)
 *   - runs the lookup as a simple fetch-on-change effect (no TanStack Query
 *     dep — single-row lookups against a local SQLite table are cheap and
 *     don't need caching/invalidation infrastructure)
 *   - recomputes on kind/name/level/locale change
 *
 * Returns `{ data, isLoading }`:
 *   - `data === null` → caller must render the English original
 *   - `data` populated → caller may render Russian HTML via <SafeHtml/>
 *
 * Callers: CreatureCard, StatBlockModal, SpellCard, ItemCard, FeatDetail,
 * ActionsPage. Each one owns the conditional render branch; the hook stays
 * pure data-access.
 */

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getTranslation, type TranslationKind, type TranslationRow } from '@/shared/api'

interface UseContentTranslationResult {
  data: TranslationRow | null
  isLoading: boolean
  locale: string
}

export function useContentTranslation(
  kind: TranslationKind,
  name: string | null | undefined,
  level: number | null | undefined,
): UseContentTranslationResult {
  const { i18n } = useTranslation()
  const locale = (i18n.resolvedLanguage ?? i18n.language ?? 'en').split('-')[0]

  const [data, setData] = useState<TranslationRow | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // 'en' or missing name → no lookup, no loading state.
    if (locale === 'en' || !name) {
      setData(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    getTranslation(kind, name, level ?? null, locale)
      .then((row) => {
        if (!cancelled) setData(row)
      })
      .catch((err) => {
        console.warn('[useContentTranslation]', err)
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [kind, name, level, locale])

  return { data, isLoading, locale }
}
