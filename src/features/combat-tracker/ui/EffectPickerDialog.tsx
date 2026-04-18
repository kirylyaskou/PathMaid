import { useState, useEffect, useCallback, useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { SearchInput } from '@/shared/ui/search-input'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { Skeleton } from '@/shared/ui/skeleton'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible'
import { cn } from '@/shared/lib/utils'
import {
  listSpellEffects,
  getContextEffectsForEncounter,
  applyEffectToCombatant,
} from '@/shared/api/effects'
import type { SpellEffectRow, SpellEffectCategory } from '@/entities/spell-effect'
import { useEffectStore, durationToRounds } from '@/entities/spell-effect'
import { useCombatTrackerStore } from '../model/store'
import { toast } from 'sonner'

interface EffectPickerDialogProps {
  combatantId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CATEGORY_LABEL: Record<SpellEffectCategory, string> = {
  spell: 'Spell Effects',
  alchemical: 'Alchemical',
  other: 'Other',
}
const CATEGORY_ORDER: SpellEffectCategory[] = ['spell', 'alchemical', 'other']

export function EffectPickerDialog({ combatantId, open, onOpenChange }: EffectPickerDialogProps) {
  const [allEffects, setAllEffects] = useState<SpellEffectRow[]>([])
  const [contextEffects, setContextEffects] = useState<SpellEffectRow[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [openSections, setOpenSections] = useState<Record<SpellEffectCategory, boolean>>({
    spell: true,
    alchemical: true,
    other: true,
  })

  // 61-02: refetch context when data version bumps (sync, overrides).
  const entityDataVersion = useCombatTrackerStore((s) => s.entityDataVersion)

  useEffect(() => {
    if (!open) return
    const encounterId = useCombatTrackerStore.getState().combatId
    setLoading(true)
    setSearchQuery('')
    Promise.all([
      listSpellEffects(),
      encounterId ? getContextEffectsForEncounter(encounterId) : Promise.resolve([]),
    ])
      .then(([all, ctx]) => {
        setAllEffects(all)
        setContextEffects(ctx)
      })
      .finally(() => setLoading(false))
  }, [open, entityDataVersion])

  const isSearching = searchQuery.trim().length > 0

  // Empty search: show context default (fall back to all if context empty).
  // Non-empty search: global search across all effects, name + description.
  const displayed = useMemo(() => {
    if (isSearching) {
      const q = searchQuery.toLowerCase()
      return allEffects.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.description ?? '').toLowerCase().includes(q)
      )
    }
    return contextEffects.length > 0 ? contextEffects : allEffects
  }, [isSearching, searchQuery, allEffects, contextEffects])

  const grouped = useMemo(() => {
    const acc: Record<SpellEffectCategory, SpellEffectRow[]> = {
      spell: [],
      alchemical: [],
      other: [],
    }
    for (const e of displayed) acc[e.category].push(e)
    return acc
  }, [displayed])

  const showFallbackHint =
    !isSearching && contextEffects.length === 0 && !loading

  const handleSelect = useCallback(
    async (effect: SpellEffectRow) => {
      const encounterId = useCombatTrackerStore.getState().combatId
      if (!encounterId) return
      const remainingTurns = durationToRounds(effect.duration_json)
      try {
        const newId = await applyEffectToCombatant(encounterId, combatantId, effect.id, remainingTurns)
        useEffectStore.getState().addEffect({
          id: newId,
          combatantId,
          effectId: effect.id,
          effectName: effect.name,
          remainingTurns,
          rulesJson: effect.rules_json,
          durationJson: effect.duration_json,
          description: effect.description,
          level: effect.level,
        })
        toast(`Applied ${effect.name}`)
        onOpenChange(false)
      } catch {
        toast(`Failed to apply ${effect.name}`)
      }
    },
    [combatantId, onOpenChange]
  )

  const toggleSection = useCallback((cat: SpellEffectCategory) => {
    setOpenSections((prev) => ({ ...prev, [cat]: !prev[cat] }))
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="text-sm">Add Spell Effect</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-2 pt-2">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              contextEffects.length > 0
                ? 'Search all effects…'
                : 'Search effects…'
            }
            aria-label="Search spell effects"
            autoFocus
            className="h-8 text-xs"
          />
          {showFallbackHint && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              No spell context in this encounter — browsing full library ({allEffects.length} effects).
            </p>
          )}
        </div>

        <ScrollArea className="max-h-[28rem] px-2 pb-2">
          {loading ? (
            <div className="space-y-1 px-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : displayed.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No effects found</p>
          ) : (
            <div className="space-y-1">
              {CATEGORY_ORDER.map((cat) => {
                const rows = grouped[cat]
                if (rows.length === 0) return null
                const isOpen = openSections[cat]
                return (
                  <Collapsible key={cat} open={isOpen} onOpenChange={() => toggleSection(cat)}>
                    <CollapsibleTrigger
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5',
                        'text-xs font-semibold uppercase tracking-wider text-muted-foreground',
                        'hover:bg-accent/20 transition-colors'
                      )}
                    >
                      <ChevronDown
                        className={cn(
                          'w-3 h-3 transition-transform',
                          isOpen ? '' : '-rotate-90'
                        )}
                      />
                      <span>{CATEGORY_LABEL[cat]}</span>
                      <span className="font-mono text-[10px] text-muted-foreground/70">
                        ({rows.length})
                      </span>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="grid grid-cols-2 gap-1 pb-1">
                        {rows.map((effect) => {
                          const desc = effect.description
                            ? effect.description.slice(0, 90)
                            : null
                          return (
                            <div
                              key={effect.id}
                              role="button"
                              tabIndex={0}
                              className="flex flex-col px-2.5 py-1.5 rounded-md cursor-pointer hover:bg-accent/30 transition-colors border border-border/20 bg-card/30 min-w-0"
                              onClick={() => handleSelect(effect)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSelect(effect)}
                            >
                              <span className="text-sm font-semibold truncate">{effect.name}</span>
                              {desc && (
                                <span className="text-[11px] text-muted-foreground line-clamp-2">{desc}</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
