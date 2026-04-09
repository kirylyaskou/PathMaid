import { useState, useEffect } from 'react'
import { ChevronRight } from 'lucide-react'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/shared/ui/collapsible'
import { getSpellById, getSpellByName } from '@/shared/api'
import type { SpellRow } from '@/shared/api'
import { cn } from '@/shared/lib/utils'
import { sanitizeFoundryText } from '@/shared/lib/foundry-tokens'
import { TRADITION_COLORS, actionCostLabel, rankLabel, parseDamageDisplay, parseAreaDisplay } from '../lib/helpers'

interface SpellInlineCardProps {
  spellId?: string
  /** Look up spell by name — used in PC sheet where only names are available */
  spellName?: string
  /** Hide the "Linked Spell" header — for use in spell lists */
  compact?: boolean
}

export function SpellInlineCard({ spellId, spellName, compact }: SpellInlineCardProps) {
  const [spell, setSpell] = useState<SpellRow | null | 'loading'>('loading')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setSpell('loading')
    if (spellId) {
      getSpellById(spellId).then(setSpell).catch(() => setSpell(null))
    } else if (spellName) {
      getSpellByName(spellName).then(setSpell).catch(() => setSpell(null))
    }
  }, [spellId, spellName])

  if (spell === 'loading') {
    if (compact) return <div className="text-sm text-muted-foreground px-1 py-0.5">{spellName ?? '…'}</div>
    return (
      <div className="space-y-1">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Linked Spell</p>
        <p className="text-xs text-muted-foreground px-3 py-2">Loading…</p>
      </div>
    )
  }

  if (!spell) {
    // In compact mode just show the name as plain text (spell not in local DB)
    if (compact) return <div className="text-sm px-1 py-0.5">{spellName}</div>
    return (
      <div className="space-y-1">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Linked Spell</p>
        <p className="text-xs text-muted-foreground px-3 py-2">Spell not found</p>
      </div>
    )
  }

  const traditions: string[] = spell.traditions ? JSON.parse(spell.traditions) : []
  const traits: string[] = spell.traits ? JSON.parse(spell.traits) : []
  const damageDisplay = parseDamageDisplay(spell.damage)
  const areaDisplay = parseAreaDisplay(spell.area)

  return (
    <div className="space-y-1">
      {!compact && <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Linked Spell</p>}
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <div className={cn(
            'flex items-center gap-2 px-3 py-2',
            'rounded-md border border-border/40 bg-secondary/30',
            'hover:border-border/60 hover:bg-secondary/50 transition-colors cursor-pointer'
          )}>
            <ChevronRight
              className={cn(
                'w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-150',
                open && 'rotate-90'
              )}
            />
            <span className="text-[13px] font-medium flex-1 truncate">{spell.name}</span>
            {spell.action_cost && (
              <span className="font-mono text-primary text-[12px] shrink-0">{actionCostLabel(spell.action_cost)}</span>
            )}
            <span className="text-[11px] text-muted-foreground shrink-0">{rankLabel(spell.rank)}</span>
            {spell.save_stat && (
              <span className="capitalize text-[11px] text-muted-foreground shrink-0">{spell.save_stat}</span>
            )}
            {damageDisplay !== '—' && (
              <span className="font-mono text-pf-blood text-[11px] shrink-0">{damageDisplay}</span>
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 pt-2 space-y-2 border-t border-border/20">
            {/* Meta line */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {spell.range_text && (
                <span>Range: <span className="text-foreground">{spell.range_text}</span></span>
              )}
              {areaDisplay && (
                <span>Area: <span className="text-foreground">{areaDisplay}</span></span>
              )}
              {spell.duration_text && (
                <span>Duration: <span className="text-foreground">{spell.duration_text}</span></span>
              )}
              {spell.source_book && (
                <span>Source: <span className="text-foreground">{spell.source_book}</span></span>
              )}
            </div>

            {/* Traditions */}
            {traditions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {traditions.map((t) => (
                  <span
                    key={t}
                    className={cn(
                      'px-1.5 py-0.5 text-[10px] rounded border uppercase tracking-wider font-semibold',
                      TRADITION_COLORS[t] ?? 'bg-secondary text-secondary-foreground border-border'
                    )}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Traits */}
            {traits.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {traits.map((t) => (
                  <span
                    key={t}
                    className="px-1 py-0.5 text-[10px] rounded bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            {spell.description && (
              <p className="text-xs text-foreground/75 leading-relaxed">
                {sanitizeFoundryText(spell.description)}
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
