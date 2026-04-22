import { useState, useEffect, useMemo } from 'react'
import { User, Skull } from 'lucide-react'
import { Separator } from '@/shared/ui/separator'
import { useCombatantStore, isNpc } from '@/entities/combatant'
import { useShallow } from 'zustand/react/shallow'
import { fetchCreatureStatBlockData } from '@/entities/creature'
import type { CreatureStatBlockData } from '@/entities/creature'
import { applyTierToStatBlock } from '@engine'
import { HpControls } from './HpControls'
import { ConditionSection } from './ConditionSection'
import { EffectsSection } from './EffectsSection'

interface CombatantDetailProps {
  combatantId: string
}

export function CombatantDetail({ combatantId }: CombatantDetailProps) {
  const combatant = useCombatantStore(
    useShallow((s) => s.combatants.find((c) => c.id === combatantId))
  )
  const [creature, setCreature] = useState<CreatureStatBlockData | null>(null)

  useEffect(() => {
    if (!combatant || !combatant.creatureRef || combatant.kind !== 'npc') {
      setCreature(null)
      return
    }
    let cancelled = false
    fetchCreatureStatBlockData(combatant.creatureRef).then((data) => {
      if (!cancelled) setCreature(data)
    })
    return () => { cancelled = true }
  }, [combatant?.creatureRef, combatant?.kind])

  // CombatantDetail's bottom pane (HpControls → CombatantSavesBar,
  // useHideAction) read `creature.ac / .fort / .ref / .will / .perception / .skills`
  // directly and ignored the combatant's Weak/Elite tier. CombatPage applies
  // applyTierToStatBlock only to the right-pane CreatureStatBlock, so the two
  // panes disagreed on every numeric stat for non-normal tiers. Apply the same
  // engine helper here against the NPC tier (PC and hazard combatants never
  // carry a tier). HP is deliberately skipped by applyTierToStatBlock — the
  // combatant row already bakes the HP delta at add-time, so double-applying
  // would compound the adjustment.
  const tierAdjustedCreature = useMemo(() => {
    if (!creature || !combatant || !isNpc(combatant)) return creature
    return applyTierToStatBlock(creature, combatant.weakEliteTier ?? 'normal')
  }, [creature, combatant])

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
        {combatant.kind !== 'pc' ? (
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
            {combatant.kind !== 'pc' ? ' — NPC' : ' — PC'}
          </p>
        </div>
      </div>

      <Separator />

      <HpControls
        combatant={combatant}
        iwrImmunities={combatant.kind === 'npc' ? combatant.iwrImmunities : undefined}
        iwrWeaknesses={combatant.kind === 'npc' ? combatant.iwrWeaknesses : undefined}
        iwrResistances={combatant.kind === 'npc' ? combatant.iwrResistances : undefined}
        creature={tierAdjustedCreature}
      />

      <Separator />

      <ConditionSection combatantId={combatantId} />

      <Separator />

      <EffectsSection combatantId={combatantId} />
    </div>
  )
}
