/**
 * Visual indicator that surfaces when a monster (or other content) has
 * no entry in the vendored pf2-locale-ru pack and the user is viewing
 * Russian. Parent computes the visibility condition and renders this
 * component conditionally — keeps the component prop-free and pure.
 *
 * Tooltip wording is driven by `statblock.untranslated.tooltip`; the
 * pill body shows "RU" with a strikethrough so the meaning carries
 * even without the tooltip.
 */

import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from './tooltip'

interface NoTranslationBadgeProps {
  className?: string
}

export function NoTranslationBadge({ className }: NoTranslationBadgeProps) {
  const { t } = useTranslation('common')
  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
              'bg-pf-blood/20 text-pf-blood border border-pf-blood/40',
              className,
            )}
            aria-label={t('statblock.untranslated.tooltip')}
          >
            <span aria-hidden="true">🚫</span>
            <span className="line-through">{t('statblock.untranslated.label')}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs whitespace-pre-wrap">
          {t('statblock.untranslated.tooltip')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
