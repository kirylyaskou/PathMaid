import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { User, Skull, AlertTriangle } from 'lucide-react'
import { Separator } from '@/shared/ui/separator'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
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
  const { t } = useTranslation('common')
  const combatant = useCombatantStore(
    useShallow((s) => s.combatants.find((c) => c.id === combatantId))
  )
  const [creature, setCreature] = useState<CreatureStatBlockData | null>(null)
  const [hazardDamage, setHazardDamage] = useState(0)
  const updateHp = useCombatantStore((s) => s.updateHp)

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
        <p className="text-sm">{t('combatantDetail.notFound')}</p>
      </div>
    )
  }

  if (combatant.kind === 'hazard') {
    return (
      <div className="h-full overflow-y-auto p-4 space-y-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
          <div>
            <h2 className="text-lg font-semibold">{combatant.displayName}</h2>
            <p className="text-xs text-muted-foreground">{t('combatantDetail.initiativeLabel')} {combatant.initiative}</p>
          </div>
          {combatant.hazardDisabled && <span className="ml-auto text-amber-400 font-bold">DISABLED!</span>}
        </div>
        {combatant.maxHp > 0 && (
          <div className="space-y-2">
            <p className="text-sm">HP {combatant.hp}/{combatant.maxHp}</p>
            <div className="flex items-center gap-2">
              <Input className="w-20" type="number" min={0} value={hazardDamage} onChange={(e) => setHazardDamage(Math.max(0, Number(e.target.value) || 0))} aria-label={t('pages.hazards.finalDamage')} />
              <Button size="sm" disabled={hazardDamage <= 0} onClick={() => { updateHp(combatant.id, -hazardDamage); setHazardDamage(0) }}>{t('pages.hazards.applyDamage')}</Button>
              <Button variant="outline" size="sm" disabled={hazardDamage <= 0} onClick={() => { updateHp(combatant.id, hazardDamage); setHazardDamage(0) }}>+HP</Button>
            </div>
          </div>
        )}
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
            {t('combatantDetail.initiativeLabel')} <span className="font-mono">{combatant.initiative}</span>
            {combatant.kind !== 'pc' ? ` — ${t('combatantDetail.npc')}` : ` — ${t('combatantDetail.pc')}`}
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
