import { useEffect, useState } from 'react'
import { Swords, Shield as ShieldIcon, Sparkles } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Collapsible, CollapsibleContent } from '@/shared/ui/collapsible'
import { SectionHeader } from '@/shared/ui/section-header'
import { AbilityCard } from '@/shared/ui/ability-card'
import { highlightGameText } from '../lib/foundry-text'
import type { ClassifiedAbilities } from '../model/classify-abilities'

type AbilityTab = 'offensive' | 'defensive' | 'other'

interface CreatureAbilitiesSectionProps {
  classified: ClassifiedAbilities
  onRoll: (formula: string, label: string) => void
}

export function CreatureAbilitiesSection({ classified, onRoll }: CreatureAbilitiesSectionProps) {
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
      { id: 'offensive', label: 'Offensive', icon: Swords, count: classified.offensive.length },
      { id: 'defensive', label: 'Defensive', icon: ShieldIcon, count: classified.defensive.length },
      { id: 'other', label: 'Other', icon: Sparkles, count: classified.other.length },
    ] as const
  ).filter(({ count }) => count > 0)

  const activeList = classified[tab]

  return (
    <Collapsible defaultOpen>
      <SectionHeader>Abilities</SectionHeader>
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
            <AbilityCard
              name={activeList[0].name}
              actionCost={activeList[0].actionCost !== 0 ? activeList[0].actionCost : undefined}
              traits={activeList[0].traits}
            >
              <p className="text-sm text-foreground/80 leading-relaxed">
                {highlightGameText(activeList[0].description, (f) => onRoll(f, activeList[0].name))}
              </p>
            </AbilityCard>
          ) : (
            <div
              className="grid gap-2 items-start"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
            >
              {activeList.map((ability, i) => (
                <AbilityCard
                  key={`${tab}-${i}`}
                  name={ability.name}
                  actionCost={ability.actionCost !== 0 ? ability.actionCost : undefined}
                  traits={ability.traits}
                >
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {highlightGameText(ability.description, (f) => onRoll(f, ability.name))}
                  </p>
                </AbilityCard>
              ))}
            </div>
          )}

          {classified.reactions.length > 0 && (
            <div className="pt-2 border-t border-border/30">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Reactions
              </p>
              <div
                className="grid gap-2 items-start"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
              >
                {classified.reactions.map((ability, i) => (
                  <AbilityCard
                    key={`react-${i}`}
                    name={ability.name}
                    actionCost="reaction"
                    traits={ability.traits}
                  >
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {highlightGameText(ability.description, (f) => onRoll(f, ability.name))}
                    </p>
                  </AbilityCard>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
