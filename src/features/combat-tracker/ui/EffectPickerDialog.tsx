import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { SearchInput } from '@/shared/ui/search-input'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { Skeleton } from '@/shared/ui/skeleton'
import { listSpellEffects, applyEffectToCombatant } from '@/shared/api/effects'
import type { SpellEffectRow } from '@/entities/spell-effect'
import { useEffectStore, durationToRounds } from '@/entities/spell-effect'
import { useCombatTrackerStore } from '../model/store'
import { toast } from 'sonner'

interface EffectPickerDialogProps {
  combatantId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EffectPickerDialog({ combatantId, open, onOpenChange }: EffectPickerDialogProps) {
  const [effects, setEffects] = useState<SpellEffectRow[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setSearchQuery('')
    listSpellEffects()
      .then(setEffects)
      .finally(() => setLoading(false))
  }, [open])

  const filtered = effects.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
        })
        toast(`Applied ${effect.name}`)
        onOpenChange(false)
      } catch {
        toast(`Failed to apply ${effect.name}`)
      }
    },
    [combatantId, onOpenChange]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="text-sm">Add Spell Effect</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-2 pt-2">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search effects..."
            aria-label="Search spell effects"
            autoFocus
            className="h-8 text-xs"
          />
        </div>

        <ScrollArea className="max-h-80 px-2 pb-2">
          {loading ? (
            <div className="space-y-1 px-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No effects found</p>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((effect) => {
                const desc = effect.description
                  ? effect.description.slice(0, 100)
                  : null
                return (
                  <div
                    key={effect.id}
                    role="button"
                    tabIndex={0}
                    className="flex flex-col px-3 py-2 rounded-md cursor-pointer hover:bg-accent/30 transition-colors"
                    onClick={() => handleSelect(effect)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSelect(effect)}
                  >
                    <span className="text-sm font-semibold">{effect.name}</span>
                    {desc && (
                      <span className="text-xs text-muted-foreground truncate">{desc}</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
