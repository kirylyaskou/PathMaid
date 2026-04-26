import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Swords, Shield as ShieldIcon, Sparkles } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Collapsible, CollapsibleContent } from '@/shared/ui/collapsible'
import { SectionHeader } from '@/shared/ui/section-header'
import { AbilityCard } from '@/shared/ui/ability-card'
import { highlightGameText } from '../lib/foundry-text'
import type { ClassifiedAbilities } from '../model/classify-abilities'
import type { AbilityLoc } from '@/shared/i18n'
import { useContentTranslation } from '@/shared/i18n'
import type { DisplayActionCost } from '../model/types'
import { SafeHtml } from '@/shared/lib/safe-html'

type AbilityTab = 'offensive' | 'defensive' | 'other'
type AbilityEntry = ClassifiedAbilities['offensive'][number]

interface CreatureAbilitiesSectionProps {
  classified: ClassifiedAbilities
  onRoll: (formula: string, label: string) => void
  /** id-keyed Map of pack `items[]` (from MonsterStructuredLoc.items) — caller
   *  builds it once at the parent so each card row stays a sync prop lookup. */
  itemsLocById?: Map<string, AbilityLoc>
}

function resolveAbilityLoc(
  ability: { id?: string; name: string; actionCost?: DisplayActionCost; description: string; traits?: string[] },
  loc: AbilityLoc | undefined,
) {
  // Empty `loc.description` is valid (item carries name-only translation) —
  // we still take the localized name; description falls back to engine.
  const localizedDesc = loc?.description?.trim()
  return {
    displayName: loc?.name ?? ability.name,
    displayCost: ability.actionCost,
    displayTraits: ability.traits ?? [],
    locDescription: localizedDesc && localizedDesc.length > 0 ? loc!.description : undefined,
    // EN name for Tier-2 action-dict fallback lookup in AbilityCardResolved.
    // Always the engine name so action-dict keying stays consistent regardless
    // of whether a per-creature pack overlay exists.
    actionDictKey: ability.name,
  }
}

function AbilityCardResolved({
  ability,
  loc,
  cardKey,
  actionCostOverride,
  onRoll,
}: {
  ability: AbilityEntry
  loc: AbilityLoc | undefined
  cardKey: string
  actionCostOverride?: DisplayActionCost
  onRoll: (formula: string, label: string) => void
}) {
  const { displayName, displayCost, displayTraits, locDescription, actionDictKey } =
    resolveAbilityLoc(ability, loc)

  // Tier-2 fallback: action-kind dictionary (actionspf2e pack — base PF2e SRD shared abilities).
  // Pass null as name when Tier-1 hit to short-circuit the hook with zero DB query.
  // Hook is always called (rules of hooks); the null guard lives inside useContentTranslation.
  const actionDictName = locDescription === undefined ? actionDictKey : null
  const { data: actionTranslation } = useContentTranslation('action', actionDictName, null)

  const cost = actionCostOverride ?? (displayCost !== 0 ? displayCost : undefined)

  // Description rendering precedence: Tier 1 > Tier 2 > Tier 3 (engine EN).
  let descriptionNode: ReactNode
  if (locDescription) {
    // Tier 1 — pack-native per-creature overlay (RU HTML from items[]).
    // SafeHtml sanitizes + resolves Foundry @-tokens; <strong>/<p> structure preserved.
    descriptionNode = (
      <SafeHtml html={locDescription} className="text-sm text-foreground/80 leading-relaxed" />
    )
  } else if (actionTranslation && actionTranslation.textLoc.trim().length > 0) {
    // Tier 2 — action-kind dictionary (RU HTML from actionspf2e pack).
    descriptionNode = (
      <SafeHtml html={actionTranslation.textLoc} className="text-sm text-foreground/80 leading-relaxed" />
    )
  } else {
    // Tier 3 — engine EN raw with clickable formula highlighting.
    descriptionNode = (
      <p className="text-sm text-foreground/80 leading-relaxed">
        {highlightGameText(ability.description, (f) => onRoll(f, ability.name))}
      </p>
    )
  }

  return (
    <AbilityCard key={cardKey} name={displayName} actionCost={cost} traits={displayTraits}>
      {descriptionNode}
    </AbilityCard>
  )
}

export function CreatureAbilitiesSection({ classified, onRoll, itemsLocById }: CreatureAbilitiesSectionProps) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<AbilityTab>('offensive')

  // Switch away from 'offensive' if it's empty — fall back to first non-empty
  // tab so creatures with only defensive/other abilities don't open blank.
  useEffect(() => {
    if (tab === 'offensive' && classified.offensive.length === 0) {
      if (classified.defensive.length > 0) setTab('defensive')
      else if (classified.other.length > 0) setTab('other')
    }
  }, [tab, classified.offensive.length, classified.defensive.length, classified.other.length])

  const tabs = (
    [
      { id: 'offensive', label: t('statblock.offensive'), icon: Swords, count: classified.offensive.length },
      { id: 'defensive', label: t('statblock.defensive'), icon: ShieldIcon, count: classified.defensive.length },
      { id: 'other', label: t('statblock.other'), icon: Sparkles, count: classified.other.length },
    ] as const
  ).filter(({ count }) => count > 0)

  const activeList = classified[tab]

  return (
    <Collapsible defaultOpen>
      <SectionHeader>{t('statblock.abilities')}</SectionHeader>
      <CollapsibleContent>
        <div className="px-4 py-3 space-y-3">
          <div className="flex flex-wrap gap-1">
            {tabs.map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors',
                  tab === id
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'hover:bg-muted/50 border border-transparent',
                )}
              >
                <Icon className="w-3 h-3" />
                {label}
                <span className="text-muted-foreground">({count})</span>
              </button>
            ))}
          </div>

          {activeList.length === 1 ? (
            <AbilityCardResolved
              ability={activeList[0]}
              loc={activeList[0].id ? itemsLocById?.get(activeList[0].id) : undefined}
              cardKey={`${tab}-0`}
              onRoll={onRoll}
            />
          ) : (
            <div
              className="grid gap-2 items-start"
            >
              {activeList.map((ability, i) => (
                <AbilityCardResolved
                  key={`${tab}-${i}`}
                  ability={ability}
                  loc={ability.id ? itemsLocById?.get(ability.id) : undefined}
                  cardKey={`${tab}-${i}`}
                  onRoll={onRoll}
                />
              ))}
            </div>
          )}

          {classified.reactions.length > 0 && (
            <div className="pt-2 border-t border-border/30">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {t('statblock.reactions')}
              </p>
              <div
                className="grid gap-2 items-start"
              >
                {classified.reactions.map((ability, i) => (
                  <AbilityCardResolved
                    key={`react-${i}`}
                    ability={ability}
                    loc={ability.id ? itemsLocById?.get(ability.id) : undefined}
                    cardKey={`react-${i}`}
                    actionCostOverride="reaction"
                    onRoll={onRoll}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
