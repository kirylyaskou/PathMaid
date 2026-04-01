import { User, Skull } from 'lucide-react'
import { Separator } from '@/shared/ui/separator'
import { useCombatantStore } from '@/entities/combatant'
import { useShallow } from 'zustand/react/shallow'
import { HpControls } from './HpControls'
import { ConditionSection } from './ConditionSection'

interface CombatantDetailProps {
  combatantId: string
}

export function CombatantDetail({ combatantId }: CombatantDetailProps) {
  const combatant = useCombatantStore(
    useShallow((s) => s.combatants.find((c) => c.id === combatantId))
  )

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
