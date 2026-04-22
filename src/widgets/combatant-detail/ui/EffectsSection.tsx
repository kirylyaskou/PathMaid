import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '@/shared/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { cn } from '@/shared/lib/utils'
import { useEffectStore, formatRemainingTurns } from '@/entities/spell-effect'
import { getActiveEffectsForCombatant, removeEffectFromCombatant } from '@/shared/api/effects'
import { useCombatTrackerStore, EffectPickerDialog } from '@/features/combat-tracker'
import type { ActiveEffect } from '@/entities/spell-effect'

interface EffectsSectionProps {
  combatantId: string
}

interface EffectDetailPanelProps {
  effect: ActiveEffect
  onClose: () => void
}

function EffectDetailPanel({ effect, onClose }: EffectDetailPanelProps) {
  const descText = effect.description
    ? effect.description.slice(0, 350)
    : null

  return (
    <div className="mt-2 rounded-md border border-primary/30 bg-card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-sm flex-1">{effect.effectName}</span>
        <span className="text-xs text-muted-foreground font-mono">
          {formatRemainingTurns(effect.remainingTurns)}
        </span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-1">
          <X className="w-3 h-3" />
        </button>
      </div>
      {descText && (
        <p className="text-xs text-foreground/75 leading-relaxed">
          {descText}{descText.length >= 350 ? '…' : ''}
        </p>
      )}
    </div>
  )
}

export function EffectsSection({ combatantId }: EffectsSectionProps) {
  const effects = useEffectStore(
    useShallow((s) => s.activeEffects.filter((e) => e.combatantId === combatantId))
  )
  const [pickerOpen, setPickerOpen] = useState(false)
  const [openEffectId, setOpenEffectId] = useState<string | null>(null)

  useEffect(() => {
    const encounterId = useCombatTrackerStore.getState().combatId
    if (!encounterId) return
    getActiveEffectsForCombatant(encounterId, combatantId).then((rows) => {
      useEffectStore.getState().setEffectsForCombatant(
        combatantId,
        rows.map((r) => ({
          id: r.id,
          combatantId,
          effectId: r.effect_id,
          effectName: r.name,
          remainingTurns: r.remaining_turns,
          rulesJson: r.rules_json,
          durationJson: r.duration_json,
          description: r.description,
          level: r.level,
        }))
      )
    })
  }, [combatantId])

  const handleRemove = useCallback(async (effectDbId: string) => {
    // re-fetch the combatant's active rows AFTER the DELETE so the
    // FK cascade has already removed any auto-granted children. Then resync
    // the store by name to drop store entries for the removed chain.
    await removeEffectFromCombatant(effectDbId)
    const encounterId = useCombatTrackerStore.getState().combatId
    if (encounterId) {
      const rows = await getActiveEffectsForCombatant(encounterId, combatantId)
      useEffectStore.getState().setEffectsForCombatant(
        combatantId,
        rows.map((r) => ({
          id: r.id,
          combatantId,
          effectId: r.effect_id,
          effectName: r.name,
          remainingTurns: r.remaining_turns,
          rulesJson: r.rules_json,
          durationJson: r.duration_json,
          description: r.description,
          level: r.level,
        })),
      )
    } else {
      useEffectStore.getState().removeEffect(effectDbId)
    }
    if (openEffectId === effectDbId) setOpenEffectId(null)
  }, [combatantId, openEffectId])

  const handleToggleDetail = useCallback((effectId: string) => {
    setOpenEffectId((prev) => (prev === effectId ? null : effectId))
  }, [])

  const openEffect = openEffectId ? effects.find((e) => e.id === openEffectId) ?? null : null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Active Effects
        </h4>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setPickerOpen(true)}>
          + Add Effect
        </Button>
      </div>

      {effects.length > 0 ? (
        <div className="space-y-0.5">
          {effects.map((e) => (
            <TooltipProvider key={e.id}>
              <div
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors',
                  'hover:bg-accent/10 cursor-pointer'
                )}
              >
                <button
                  className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  onClick={() => handleToggleDetail(e.id)}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-sm font-semibold flex-1 truncate">
                        {e.effectName}
                      </span>
                    </TooltipTrigger>
                    {e.description && (
                      <TooltipContent side="left" className="max-w-xs text-xs">
                        {e.description.slice(0, 300)}
                      </TooltipContent>
                    )}
                  </Tooltip>
                  <span className="text-xs text-muted-foreground font-mono shrink-0">
                    {formatRemainingTurns(e.remainingTurns)}
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6 shrink-0 hover:text-destructive"
                  aria-label={`Remove ${e.effectName}`}
                  onClick={(ev) => { ev.stopPropagation(); void handleRemove(e.id) }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </TooltipProvider>
          ))}
        </div>
      ) : (
        <div className="rounded border border-dashed border-border/40 py-3 text-center text-xs text-muted-foreground">
          No active effects
        </div>
      )}

      {openEffect !== null && (
        <EffectDetailPanel effect={openEffect} onClose={() => setOpenEffectId(null)} />
      )}

      <EffectPickerDialog
        combatantId={combatantId}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
      />
    </div>
  )
}
