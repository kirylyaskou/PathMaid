import { cn } from '@/shared/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible'
import { ChevronDown } from 'lucide-react'
import type { SpellcastingSection } from '@/entities/spell'
import { traditionColor, rankLabel } from '../lib/spellcasting-helpers'
import { SpellCard } from './SpellCard'

/**
 * Read-only spellcasting renderer for contexts without combat state
 * (bestiary preview, builder preview, creature modals).
 *
 * Shows spells grouped by rank as cards — no slot pips, no cast buttons,
 * no add/remove controls. Live-combat callers should pass
 * `<SpellcastingBlock>` via `CreatureStatBlock.renderSpellcasting` instead.
 */
export function SpellListPreview({ section, creatureName }: {
  section: SpellcastingSection
  creatureName?: string
}) {
  return (
    <Collapsible defaultOpen>
      <div className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-primary/40">
        <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="font-semibold text-sm text-foreground">Spellcasting</span>
          <span className={cn("px-1.5 py-0.5 text-[10px] rounded border uppercase tracking-wider font-semibold", traditionColor(section.tradition))}>
            {section.tradition} {section.castType}
          </span>
          <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="px-4 pb-3 pt-2 space-y-3">
          <div className="flex gap-4 text-sm">
            {section.spellDc > 0 && (
              <span className="text-muted-foreground">DC{' '}
                <span className="font-mono font-bold text-primary">{section.spellDc}</span>
              </span>
            )}
            {section.spellAttack !== 0 && (
              <span className="text-muted-foreground">Attack{' '}
                <span className="font-mono font-bold text-primary">
                  {section.spellAttack >= 0 ? '+' : ''}{section.spellAttack}
                </span>
              </span>
            )}
          </div>

          {section.spellsByRank.map((byRank) => (
            <div key={byRank.rank}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {rankLabel(byRank.rank)}
                </span>
                {byRank.rank > 0 && byRank.slots > 0 && (
                  <span className="text-xs text-muted-foreground">({byRank.slots} slots)</span>
                )}
              </div>
              <div className="space-y-1">
                {byRank.spells.map((s, i) => (
                  <SpellCard
                    key={`${s.name}-${i}`}
                    name={s.name}
                    foundryId={s.foundryId}
                    source={creatureName}
                    castRank={byRank.rank}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
