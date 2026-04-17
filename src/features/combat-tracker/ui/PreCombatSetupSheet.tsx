import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/shared/ui/sheet'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Plus } from 'lucide-react'
import { useCombatantStore } from '@/entities/combatant'
import type { Combatant } from '@/entities/combatant'
import { useConditionStore } from '@/entities/condition'
import { useEffectStore } from '@/entities/spell-effect'
import { ConditionCombobox } from './ConditionCombobox'
import { EffectPickerDialog } from './EffectPickerDialog'
import { removeCondition as removeConditionBridge } from '@/features/combat-tracker'
import type { ConditionSlug } from '@engine'

// 63-02: pre-combat setup drawer. Lets GM apply conditions/effects and tune HP
// before clicking Start. Opens via the Info icon on the pre-start combat panel.
export function PreCombatSetupSheet({ open, onOpenChange }: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const combatants = useCombatantStore(useShallow((s) => s.combatants))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[22rem] sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-sm">Pre-combat setup</SheetTitle>
          <SheetDescription className="text-xs">
            Apply conditions or effects before starting combat. Changes persist.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-3 px-4 pb-4">
          {combatants.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">
              No combatants to set up yet.
            </p>
          )}
          {combatants.map((c) => (
            <PreCombatRow key={c.id} combatant={c} />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function PreCombatRow({ combatant }: { combatant: Combatant }) {
  const activeConditions = useConditionStore(
    useShallow((s) => s.activeConditions.filter((c) => c.combatantId === combatant.id))
  )
  const effects = useEffectStore(
    useShallow((s) => s.activeEffects.filter((e) => e.combatantId === combatant.id))
  )
  const updateHp = useCombatantStore((s) => s.updateHp)
  const [effectOpen, setEffectOpen] = useState(false)
  const existingSlugs = activeConditions.map((c) => c.slug)

  return (
    <div className="rounded-md border border-border/40 bg-card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold flex-1 truncate">{combatant.displayName}</span>
        <div className="flex items-center gap-1 text-xs">
          <Input
            type="number"
            className="h-7 w-14 text-xs font-mono text-right"
            value={combatant.hp}
            onChange={(e) => {
              const v = Number(e.target.value)
              if (!Number.isFinite(v)) return
              const clamped = Math.max(0, Math.min(combatant.maxHp, v))
              updateHp(combatant.id, clamped - combatant.hp)
            }}
            min={0}
            max={combatant.maxHp}
            aria-label={`${combatant.displayName} HP`}
          />
          <span className="font-mono text-muted-foreground">/{combatant.maxHp}</span>
        </div>
      </div>

      {activeConditions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {activeConditions.map((c) => (
            <button
              key={c.slug}
              onClick={() => {
                if (c.slug.startsWith('persistent-')) {
                  useConditionStore.getState().removeCondition(combatant.id, c.slug)
                } else {
                  removeConditionBridge(combatant.id, c.slug as ConditionSlug)
                }
              }}
              className="px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary border border-primary/30 uppercase hover:bg-destructive/20 hover:border-destructive/50 transition-colors"
              title="Click to remove"
            >
              {c.slug}{c.value ? ` ${c.value}` : ''}
            </button>
          ))}
        </div>
      )}

      {effects.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {effects.map((e) => (
            <span
              key={e.id}
              className="px-1.5 py-0.5 text-[10px] rounded bg-amber-500/10 text-amber-400 border border-amber-500/30"
            >
              {e.effectName}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-1.5 pt-1">
        <ConditionCombobox combatantId={combatant.id} existingSlugs={existingSlugs} />
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8 text-xs"
          onClick={() => setEffectOpen(true)}
        >
          <Plus className="w-3 h-3" />
          Effect
        </Button>
      </div>

      <EffectPickerDialog
        combatantId={combatant.id}
        open={effectOpen}
        onOpenChange={setEffectOpen}
      />
    </div>
  )
}
