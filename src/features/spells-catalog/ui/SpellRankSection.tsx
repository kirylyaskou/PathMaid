import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/shared/ui/collapsible'
import type { SpellRow } from '@/shared/api'
import { cn } from '@/shared/lib/utils'
import { rankLabel } from '@/entities/spell'
import { SpellsTable } from './SpellsTable'

interface SpellRankSectionProps {
  rank: number
  spells: SpellRow[]
  defaultOpen?: boolean
  isFocusTab: boolean
  onSpellClick: (spellId: string) => void
}

export function SpellRankSection({ rank, spells, defaultOpen = true, isFocusTab, onSpellClick }: SpellRankSectionProps) {
  const { t } = useTranslation('common')
  const [open, setOpen] = useState(defaultOpen)
  const count = spells.length
  const label = rankLabel(rank)
  const countLabel = t('spells.rankSpells', { count })

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-secondary/40 border-b border-border/30 bg-secondary/20">
          <div className="flex items-center">
            <span className="text-sm font-semibold">{label}</span>
            <span className="text-xs text-muted-foreground ml-2">{countLabel}</span>
          </div>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-muted-foreground transition-transform duration-150',
              open && 'rotate-180'
            )}
          />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <SpellsTable spells={spells} isFocusTab={isFocusTab} onSpellClick={onSpellClick} />
      </CollapsibleContent>
    </Collapsible>
  )
}
