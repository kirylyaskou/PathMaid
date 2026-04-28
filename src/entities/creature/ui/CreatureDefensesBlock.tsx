import { useTranslation } from 'react-i18next'
import { StatRow } from '@/shared/ui/stat-row'
import { useCurrentLocale } from '@/shared/i18n/use-current-locale'
import { getTraitLabel } from '@/shared/i18n/pf2e-content'
import type { SupportedLocale } from '@/shared/i18n/config'
import type { CreatureStatBlockData } from '../model/types'
import { normalizeImmunities, formatImmunityWithExceptions } from '../model/iwr-normalize'

interface CreatureDefensesBlockProps {
  immunities: CreatureStatBlockData['immunities']
  resistances: CreatureStatBlockData['resistances']
  weaknesses: CreatureStatBlockData['weaknesses']
}

function formatIwrEntry(
  entry: { type: string; value: number; exceptions?: string[]; doubleVs?: string[] },
  locale: SupportedLocale,
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  const localizedType = getTraitLabel(entry.type.toLowerCase(), locale)
  const base = entry.exceptions && entry.exceptions.length > 0
    ? t('statblock.iwrEntryWithExceptions', {
        type: localizedType,
        value: entry.value,
        exceptions: entry.exceptions.map((e) => getTraitLabel(e.toLowerCase(), locale)).join(', '),
      })
    : t('statblock.iwrEntry', { type: localizedType, value: entry.value })
  if (entry.doubleVs && entry.doubleVs.length > 0) {
    const conds = entry.doubleVs.map((c) => getTraitLabel(c.toLowerCase(), locale)).join(', ')
    return `${base} ${t('statblock.iwrDoubleVsHint', { conditions: conds })}`
  }
  return base
}

export function CreatureDefensesBlock({
  immunities,
  resistances,
  weaknesses,
}: CreatureDefensesBlockProps) {
  const { t } = useTranslation('common')
  const locale = useCurrentLocale()

  if (immunities.length === 0 && resistances.length === 0 && weaknesses.length === 0) {
    return null
  }

  return (
    <div className="p-4 space-y-2">
      {immunities.length > 0 && (
        <StatRow label={t('statblock.iwr.immunities')}>
          {normalizeImmunities(immunities)
            .map((imm) => {
              const localized = formatImmunityWithExceptions({
                ...imm,
                type: getTraitLabel(imm.type.toLowerCase(), locale),
                exceptions: imm.exceptions?.map((e) => getTraitLabel(e.toLowerCase(), locale)),
              })
              return localized
            })
            .join(', ')}
        </StatRow>
      )}
      {resistances.length > 0 && (
        <StatRow label={t('statblock.iwr.resistances')}>
          {resistances.map((r) => formatIwrEntry(r, locale, t)).join(', ')}
        </StatRow>
      )}
      {weaknesses.length > 0 && (
        <StatRow label={t('statblock.iwr.weaknesses')}>
          {weaknesses.map((w) => formatIwrEntry(w, locale, t)).join(', ')}
        </StatRow>
      )}
    </div>
  )
}
