import { User, Skull, RotateCcw } from 'lucide-react'
import { Separator } from '@/shared/ui/separator'
import { useCombatantStore } from '@/entities/combatant'
import { useShallow } from 'zustand/react/shallow'
import { cn } from '@/shared/lib/utils'
import { HpControls } from './HpControls'
import { ConditionSection } from './ConditionSection'

interface CombatantDetailProps {
  combatantId: string
}

export function CombatantDetail({ combatantId }: CombatantDetailProps) {
  const combatant = useCombatantStore(
    useShallow((s) => s.combatants.find((c) => c.id === combatantId))
  )
  const updateCombatant = useCombatantStore((s) => s.updateCombatant)

  if (!combatant) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">Combatant not found</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center gap-3">
        {combatant.isNPC ? (
          <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center">
            <Skull className="w-5 h-5 text-destructive" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
        )}
        <div>
          <h2 className="text-lg font-semibold">{combatant.displayName}</h2>
          <p className="text-xs text-muted-foreground">
            Initiative: <span className="font-mono">{combatant.initiative}</span>
            {combatant.isNPC ? ' — NPC' : ' — PC'}
          </p>
        </div>
      </div>

      {/* FEAT-11: MAP counter — 1st / 2nd / 3rd attack, resets on turn start */}
      <div className="flex items-center gap-1 text-xs">
        <span className="text-muted-foreground uppercase tracking-wider text-[10px]">MAP:</span>
        {([0, 1, 2] as const).map((i) => {
          const active = (combatant.mapIndex ?? 0) === i
          const label = i === 0 ? '1st' : i === 1 ? '2nd (-5/-4)' : '3rd (-10/-8)'
          return (
            <button
              key={i}
              type="button"
              onClick={() => updateCombatant(combatant.id, { mapIndex: i })}
              className={cn(
                'px-1.5 py-0.5 rounded transition-colors font-mono',
                active
                  ? 'bg-primary/20 text-primary font-semibold border border-primary/30'
                  : 'hover:bg-muted/50 text-muted-foreground border border-transparent',
              )}
            >
              {label}
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => updateCombatant(combatant.id, { mapIndex: 0 })}
          title="Reset MAP"
          className="ml-1 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      <Separator />

      <HpControls
        combatant={combatant}
        iwrImmunities={combatant.iwrImmunities}
        iwrWeaknesses={combatant.iwrWeaknesses}
        iwrResistances={combatant.iwrResistances}
      />

      <Separator />

      <ConditionSection combatantId={combatantId} />
    </div>
  )
}
