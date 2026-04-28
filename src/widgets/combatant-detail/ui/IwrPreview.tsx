import { useTranslation } from 'react-i18next'
import type { IWRApplicationResult } from '@engine'

interface IwrPreviewEntry {
  type: string
  amount: number
  result: IWRApplicationResult
}

interface IwrPreviewProps {
  previews: IwrPreviewEntry[]
}

export function IwrPreview({ previews }: IwrPreviewProps) {
  const { t } = useTranslation('common')
  if (previews.length === 0) return null

  return (
    <div className="text-xs space-y-0.5 px-2 py-1.5 rounded bg-secondary/30 border border-border/30">
      {previews.map(({ type, amount, result }) => (
        <div key={type} className="space-y-0.5">
          <div className="flex justify-between text-muted-foreground/70 text-[10px]">
            <span className="capitalize">{type}</span>
            <span className="font-mono">{amount} {t('combatantDetail.iwrRaw')}</span>
          </div>
          {result.appliedImmunities.length > 0 && (
            <div className="flex justify-between text-blue-400">
              <span>{t('statblock.iwr.immunities')} ({result.appliedImmunities.map((i) => i.type).join(', ')})</span>
              <span className="font-mono">&rarr; 0</span>
            </div>
          )}
          {result.appliedWeaknesses.length > 0 && (
            <div className="flex justify-between text-red-400">
              <span>
                {t('statblock.iwr.weaknesses')} ({result.appliedWeaknesses.map((w) => `${w.type} ${w.value}`).join(', ')})
                {result.weaknessDoubled && (
                  <span className="ml-1 text-red-300/80">{t('combatantDetail.iwrDoubledHint')}</span>
                )}
              </span>
              <span className="font-mono">+{result.weaknessTotal}</span>
            </div>
          )}
          {result.appliedResistances.length > 0 && (
            <div className="flex justify-between text-green-400">
              <span>
                {t('statblock.iwr.resistances')} ({result.appliedResistances.map((r) => `${r.type} ${r.value}`).join(', ')})
                {result.resistanceDoubled && (
                  <span className="ml-1 text-green-300/80">{t('combatantDetail.iwrDoubledVsNonMagical')}</span>
                )}
              </span>
              <span className="font-mono">-{result.resistanceTotal}</span>
            </div>
          )}
        </div>
      ))}
      <div className="flex justify-between font-bold border-t border-border/30 pt-0.5">
        <span>{previews.length > 1 ? t('combatantDetail.iwrTotalFinal') : t('combatantDetail.iwrFinal')}</span>
        <span className="font-mono">
          {previews.reduce((s, p) => s + p.result.finalDamage, 0)}
        </span>
      </div>
    </div>
  )
}
