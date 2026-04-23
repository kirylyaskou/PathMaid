import { useState, useEffect } from 'react'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/shared/ui/collapsible'
import { getFeatByName } from '@/shared/api'
import type { FeatEntityRow } from '@/shared/api'
import { cn } from '@/shared/lib/utils'
import { sanitizeFoundryText } from '@/shared/lib/foundry-tokens'
import { useContentTranslation } from '@/shared/i18n'
import { ActionIcon } from '@/shared/ui/action-icon'

type ActionCost = 0 | 1 | 2 | 3 | 'reaction' | 'free'

interface FeatInlineCardProps {
  featName: string
  typeLabel?: string
  level?: number
  note?: string
}

export function FeatInlineCard({ featName, typeLabel, level, note }: FeatInlineCardProps) {
  const [feat, setFeat] = useState<FeatEntityRow | null | 'loading'>('loading')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setFeat('loading')
    getFeatByName(featName).then(setFeat).catch(() => setFeat(null))
  }, [featName])

  // Phase 80: feat translation lookup — matching key is the canonical feat
  // name; level passed in as a prop helps disambiguate same-name feats.
  const featLoadedName = feat && feat !== 'loading' ? feat.name : null
  const featLoadedLevel = feat && feat !== 'loading'
    ? typeof feat.level === 'number' ? feat.level : level ?? null
    : null
  const { data: translation } = useContentTranslation(
    'feat',
    featLoadedName,
    featLoadedLevel,
  )

  if (feat === 'loading') {
    return (
      <div className="p-3 rounded bg-pf-parchment border-l-2 border-primary/30 animate-pulse">
        <span className="text-sm text-muted-foreground">{featName}</span>
      </div>
    )
  }

  if (!feat) {
    return (
      <div className="p-3 rounded bg-pf-parchment border-l-2 border-primary/30">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm flex-1">{featName}</span>
          {typeLabel && <span className="text-[11px] text-muted-foreground shrink-0">{typeLabel}</span>}
          {level !== undefined && <span className="text-[11px] text-muted-foreground shrink-0">{level}</span>}
        </div>
        {note && <p className="mt-1 text-xs text-muted-foreground italic">{note}</p>}
      </div>
    )
  }

  let description: string | null = null
  let actionCostValue: ActionCost | null = null
  let traits: string[] = []
  try {
    const raw = JSON.parse(feat.raw_json)
    const sys = raw.system ?? {}
    description = sys.description?.value ?? null
    const actionType: string = sys.actionType?.value ?? 'passive'
    const actionNum: number | null = typeof sys.actions?.value === 'number' ? sys.actions.value : null
    if (actionType === 'free') actionCostValue = 'free'
    else if (actionType === 'reaction') actionCostValue = 'reaction'
    else if (actionNum === 1 || actionNum === 2 || actionNum === 3) actionCostValue = actionNum
    const rawTraits = sys.traits?.value
    if (Array.isArray(rawTraits)) traits = rawTraits
  } catch {
    // malformed raw_json
  }

  const hasBody = !!description || traits.length > 0 || !!note

  const header = (
    <div className={cn('flex items-center gap-2', hasBody && 'cursor-pointer')}>
      {actionCostValue !== null && (
        <ActionIcon cost={actionCostValue} className="text-base text-primary shrink-0" />
      )}
      <span className="font-semibold text-sm flex-1">{translation?.nameLoc ?? feat.name}</span>
      {typeLabel && <span className="text-[11px] text-muted-foreground shrink-0">{typeLabel}</span>}
      {level !== undefined && <span className="text-[11px] text-muted-foreground shrink-0">{level}</span>}
    </div>
  )

  if (!hasBody) {
    return (
      <div className="p-3 rounded bg-pf-parchment border-l-2 border-primary/30">
        {header}
      </div>
    )
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <div className="p-3 rounded-t bg-pf-parchment border-l-2 border-primary/30 hover:border-primary/60 transition-colors">
          {header}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-3 pb-3 pt-2 rounded-b bg-pf-parchment/60 border-l-2 border-primary/20 space-y-2 -mt-px">
          {traits.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {traits.map((t) => (
                <span
                  key={t}
                  className="px-1.5 py-0.5 text-xs rounded bg-secondary text-secondary-foreground uppercase tracking-wider"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          {note && <p className="text-xs text-muted-foreground italic">{note}</p>}
          {description && (
            <p className="text-sm text-foreground/80 leading-relaxed">
              {sanitizeFoundryText(description)}
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
