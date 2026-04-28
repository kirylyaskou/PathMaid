import { useState, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'
import { useEffectStore, mergeResistances } from '@/entities/spell-effect'
import { parseSpellEffectResistances } from '@engine'
import { Swords, Plus, Shield, Heart, ChevronUp, ChevronDown, X, Skull, HeartPulse, Sparkles } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Separator } from '@/shared/ui/separator'
import { cn } from '@/shared/lib/utils'
import { useCombatantStore, isNpc } from '@/entities/combatant'
import type { Combatant } from '@/entities/combatant'
import {
  applyIWR,
  createImmunity,
  createWeakness,
  createResistance,
  MATERIAL_EFFECTS,
  IMMUNITY_TYPES,
  type DamageType,
  type MaterialEffect,
  type ImmunityType,
  type WeaknessType,
  type ResistanceType,
} from '@engine'
import { useModifiedStats } from '@/entities/creature'
import type { CreatureStatBlockData } from '@/entities/creature'
import { damageTypeChip } from '@/shared/lib/damage-colors'
import { useCombatantHp } from '../model/use-combatant-hp'
import { CombatantSavesBar } from './CombatantSavesBar'
import { DamageTraitSelector } from './DamageTraitSelector'
import { IwrPreview } from './IwrPreview'

interface HpControlsProps {
  combatant: Combatant
  iwrImmunities?: string[]
  iwrWeaknesses?: { type: string; value: number; exceptions?: string[] }[]
  iwrResistances?: { type: string; value: number; exceptions?: string[]; doubleVs?: string[] }[]
  creature?: CreatureStatBlockData | null
}

interface DamageEntry {
  damageType: DamageType
  amount: number
}

const MATERIAL_TYPE_SET = new Set(MATERIAL_EFFECTS as readonly string[])

export function HpControls({ combatant, iwrImmunities, iwrWeaknesses, iwrResistances, creature }: HpControlsProps) {
  const { t } = useTranslation('common')
  const combatantId = combatant.id

  // Get active effects for IWR resistance overlay
  const rawEffects = useEffectStore(
    useShallow((s) => s.activeEffects.filter((e) => e.combatantId === combatantId))
  )

  const mergedResistances = useMemo(() => {
    if (rawEffects.length === 0) return iwrResistances
    const effectResistances = rawEffects.flatMap((e) =>
      parseSpellEffectResistances(e.rulesJson)
    )
    if (effectResistances.length === 0) return iwrResistances
    return mergeResistances(iwrResistances ?? [], effectResistances)
  }, [rawEffects, iwrResistances])

  const [hpInput, setHpInput] = useState(0)
  const [damageEntries, setDamageEntries] = useState<DamageEntry[]>([])
  const [materials, setMaterials] = useState<string[]>([])
  const [traitSelectorOpen, setTraitSelectorOpen] = useState(false)
  const updateCombatant = useCombatantStore((s) => s.updateCombatant)
  const inputRef = useRef<HTMLInputElement>(null)

  const { hp, maxHp, tempHp, dyingValue, deathThreshold, isDead, applyDamage, applyHeal, applyTempHp, stabilize, resurrect } =
    useCombatantHp(combatant.id)

  const statSlugs = useMemo(() => ['ac', 'fortitude', 'reflex', 'will', 'perception', 'stealth'], [])
  const modifiedStats = useModifiedStats(combatant.id, statSlugs)

  function getModified(base: number, statSlug: string): number {
    return base + (modifiedStats.get(statSlug)?.netModifier ?? 0)
  }

  const shieldAcBonus = isNpc(combatant) ? combatant.shieldAcBonus ?? 0 : 0

  const totalTypedDamage = damageEntries.reduce((s, e) => s + e.amount, 0)
  const hasEntries = damageEntries.length > 0
  const canDamage = hasEntries ? totalTypedDamage > 0 : hpInput > 0

  const toggleDamageType = useCallback((trait: DamageType) => {
    setDamageEntries((prev) => {
      const exists = prev.find((e) => e.damageType === trait)
      if (exists) return prev.filter((e) => e.damageType !== trait)
      return [...prev, { damageType: trait, amount: 0 }]
    })
  }, [])

  const toggleMaterial = useCallback((trait: string) => {
    setMaterials((prev) => prev.includes(trait) ? prev.filter((t) => t !== trait) : [...prev, trait])
  }, [])

  const updateEntryAmount = useCallback((damageType: DamageType, amount: number) => {
    setDamageEntries((prev) => prev.map((e) => (e.damageType === damageType ? { ...e, amount } : e)))
  }, [])

  const removeEntry = useCallback((damageType: DamageType) => {
    setDamageEntries((prev) => prev.filter((e) => e.damageType !== damageType))
  }, [])

  const mats = useMemo(
    () => materials.filter((t) => MATERIAL_TYPE_SET.has(t)) as MaterialEffect[],
    [materials]
  )
  const isMagical = useMemo(() => materials.includes('magic'), [materials])

  const iwrPreviews = useMemo(() => {
    if (!iwrImmunities?.length && !iwrWeaknesses?.length && !mergedResistances?.length) return null
    const activeEntries = damageEntries.filter((e) => e.amount > 0)
    if (activeEntries.length === 0) return null

    const immunities = (iwrImmunities || [])
      .filter((t) => (IMMUNITY_TYPES as readonly string[]).includes(t))
      .map((t) => createImmunity(t as ImmunityType))
    const weaknesses = (iwrWeaknesses || []).map((w) =>
      createWeakness(w.type as WeaknessType, w.value, { exceptions: w.exceptions as DamageType[] | undefined })
    )
    const resistances = (mergedResistances || []).map((r) =>
      createResistance(r.type as ResistanceType, r.value, r.exceptions as DamageType[] | undefined, r.doubleVs)
    )

    return activeEntries.map(({ damageType, amount }) => ({
      type: damageType,
      amount,
      result: applyIWR({ type: damageType, amount, materials: mats, magical: isMagical }, immunities, weaknesses, resistances),
    }))
  }, [damageEntries, mats, isMagical, iwrImmunities, iwrWeaknesses, mergedResistances])

  const handleDamage = useCallback(() => {
    if (!canDamage) return
    const effectiveDamage = iwrPreviews
      ? iwrPreviews.reduce((sum, p) => sum + p.result.finalDamage, 0)
      : hasEntries ? totalTypedDamage : hpInput
    applyDamage(effectiveDamage)
    setDamageEntries([])
    setMaterials([])
    if (!hasEntries) setHpInput(0)
  }, [canDamage, iwrPreviews, hasEntries, totalTypedDamage, hpInput, applyDamage])

  const handleHeal = useCallback(() => {
    if (hpInput <= 0) return
    applyHeal(hpInput)
    setHpInput(0)
  }, [hpInput, applyHeal])

  const handleTempHp = useCallback(() => {
    if (hpInput <= 0) return
    applyTempHp(hpInput)
    setHpInput(0)
  }, [hpInput, applyTempHp])

  const stepValue = (delta: number) =>
    setHpInput((prev) =>
      Math.max(0, prev + delta))

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setHpInput((prev) =>
      Math.max(0, prev + (e.deltaY < 0 ? 1 : -1)))
  }, [])

  const hpPercent = maxHp > 0 ? (hp / maxHp) * 100 : 0

  return (
    <div className="space-y-3">
      {/* HP bar */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Heart className="w-4 h-4 text-destructive" />
          <span className="text-lg font-mono font-bold">
            {hp}
            <span className="text-muted-foreground font-normal"> / {maxHp}</span>
          </span>
          {tempHp > 0 && (
            <span className="text-sm font-mono text-blue-400 flex items-center gap-0.5">
              <Shield className="w-3 h-3" />+{tempHp}
            </span>
          )}
          <div className="flex-1" />
          {isNpc(combatant) && combatant.shieldAcBonus != null && (
            <button
              type="button"
              onClick={() => updateCombatant(combatant.id, { shieldRaised: !combatant.shieldRaised })}
              title={t('combatantDetail.toggleShield', { bonus: shieldAcBonus })}
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors',
                combatant.shieldRaised
                  ? 'bg-amber-700/40 text-amber-200 border border-amber-600/50'
                  : 'hover:bg-muted/50 text-muted-foreground border border-transparent',
              )}
            >
              <Shield className="w-3 h-3" />
              {combatant.shieldRaised ? t('combatantDetail.shieldRaised', { bonus: shieldAcBonus }) : t('combatantDetail.raiseShield')}
            </button>
          )}
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              hpPercent > 50 ? 'bg-emerald-500' : hpPercent > 25 ? 'bg-amber-500' : 'bg-destructive'
            }`}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      </div>

      {isDead ? (
        <div className="flex flex-col items-center gap-3 py-4 rounded border border-destructive/30 bg-destructive/10">
          <Skull className="w-10 h-10 text-destructive" />
          <p className="text-lg font-bold text-destructive">{t('combatantDetail.dead')}</p>
          <p className="text-xs text-muted-foreground">
            {t('combatantDetail.dyingThreshold', { value: dyingValue, threshold: deathThreshold })}
          </p>
          <div className="flex gap-2 w-full px-4">
            <Button
              variant="secondary"
              className="flex-1 h-8 text-xs gap-1.5 bg-emerald-900/50 hover:bg-emerald-900/70 text-emerald-300"
              onClick={resurrect}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {t('combatantDetail.resurrect')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <Button
            variant="destructive"
            className="h-9 text-xs justify-start gap-1.5 w-full"
            onClick={handleDamage}
            disabled={!canDamage}
          >
            <Swords className="w-3.5 h-3.5" />
            {t('combatantDetail.damage')}
            {hasEntries && totalTypedDamage > 0 && (
              <span className="ml-auto font-mono opacity-80">{totalTypedDamage}</span>
            )}
          </Button>

          {/* Damage entries area */}
          <div className="min-h-7 max-h-20 w-full flex flex-wrap items-start gap-1 px-2 py-1 rounded border border-border/50 bg-secondary/20 overflow-y-auto">
            {!hasEntries && materials.length === 0 && (
              <span className="text-xs text-muted-foreground">{t('combatantDetail.untyped')}</span>
            )}
            {damageEntries.map((entry) => (
              <div key={entry.damageType} className="flex items-center gap-0.5">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-l capitalize ${damageTypeChip(entry.damageType)}`}>
                  {entry.damageType}
                </span>
                <input
                  type="number"
                  value={entry.amount || ''}
                  onChange={(e) => updateEntryAmount(entry.damageType, Math.max(0, parseInt(e.target.value, 10) || 0))}
                  onMouseEnter={(e) => { e.currentTarget.focus(); e.currentTarget.select() }}
                  placeholder="0"
                  className="w-9 h-[22px] text-center text-[10px] font-mono font-bold bg-secondary/50 border-y border-border/50 focus:outline-none focus:ring-1 focus:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  min={0}
                />
                <button
                  onClick={() => removeEntry(entry.damageType)}
                  className="h-[22px] px-1 text-muted-foreground hover:text-foreground bg-secondary/30 border border-border/50 rounded-r hover:bg-secondary/60 transition-colors"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
            {materials.map((m) => (
              <div key={m} className="flex items-center gap-0.5">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-l capitalize ${damageTypeChip(m)}`}>
                  {m}
                </span>
                <button
                  onClick={() => toggleMaterial(m)}
                  className="h-[22px] px-1 text-muted-foreground hover:text-foreground bg-secondary/30 border border-border/50 rounded-r hover:bg-secondary/60 transition-colors"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setTraitSelectorOpen(true)}
              className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded border border-dashed border-border/40 hover:border-border/70 transition-colors"
            >
              {t('combatantDetail.addTraits')}
            </button>
          </div>

          {/* Heal / TempHP row */}
          <div className="flex gap-1 items-center">
            <div className="flex flex-col items-center shrink-0">
              <button
                className="h-4 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-t transition-colors"
                onClick={() => stepValue(1)}
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <input
                ref={inputRef}
                type="number"
                value={hpInput || ''}
                onChange={(e) => setHpInput(Math.max(0, parseInt(e.target.value, 10) || 0))}
                onKeyDown={(e) => e.key === 'Enter' && handleDamage()}
                onWheel={handleWheel}
                onMouseEnter={(e) => { e.currentTarget.focus(); e.currentTarget.select() }}
                placeholder="0"
                className="w-10 h-8 text-center text-sm font-mono font-bold bg-secondary/30 border border-border/50 rounded-md focus:outline-none focus:ring-1 focus:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                min={0}
              />
              <button
                className="h-4 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-b transition-colors"
                onClick={() => stepValue(-1)}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
            <Button
              variant="secondary"
              className="h-full text-xs justify-start gap-1.5 flex-1 bg-emerald-900/50 hover:bg-emerald-900/70 text-emerald-300"
              onClick={handleHeal}
              disabled={hpInput <= 0}
            >
              <Plus className="w-3 h-3" />
              {t('combatantDetail.heal')}
            </Button>
            <Button
              variant="secondary"
              className="h-full text-xs justify-start gap-1.5 flex-1 bg-blue-900/50 hover:bg-blue-900/70 text-blue-300"
              onClick={handleTempHp}
              disabled={hpInput <= 0}
            >
              <Shield className="w-3 h-3" />
              {t('combatantDetail.tempHp')}
            </Button>
            {isNpc(combatant) && (
              <button
                type="button"
                onClick={() => updateCombatant(combatant.id, { mortal: !(combatant.mortal === true) })}
                title={t('combatantDetail.mortalTooltip')}
                aria-pressed={combatant.mortal === true}
                className={cn(
                  'h-full shrink-0 p-2 flex items-center justify-center gap-1 rounded-md text-xs transition-colors border',
                  combatant.mortal === true
                    ? 'bg-rose-900/60 hover:bg-rose-900/70 text-rose-200 border-rose-700/60'
                    : 'bg-secondary/30 hover:bg-secondary/60 text-muted-foreground border-border/50',
                )}
              >
                <Skull className="w-3.5 h-3.5" />
                <span>{t('combatantDetail.mortal')}</span>
              </button>
            )}
          </div>

          {dyingValue > 0 && (
            <Button
              variant="secondary"
              className="h-8 text-xs justify-start gap-1.5 w-full bg-amber-900/50 hover:bg-amber-900/70 text-amber-300"
              onClick={stabilize}
            >
              <HeartPulse className="w-3.5 h-3.5" />
              {t('combatantDetail.stabilize')}
            </Button>
          )}
        </div>
      )}

      <DamageTraitSelector
        open={traitSelectorOpen}
        onOpenChange={setTraitSelectorOpen}
        damageEntries={damageEntries}
        materials={materials}
        onToggleDamageType={toggleDamageType}
        onToggleMaterial={toggleMaterial}
        onClearAll={() => { setDamageEntries([]); setMaterials([]) }}
      />

      {creature && (
        <>
          <Separator />
          <CombatantSavesBar
            combatantId={combatant.id}
            combatantName={combatant.displayName}
            creature={creature}
            ac={getModified(creature.ac + (isNpc(combatant) && combatant.shieldRaised ? shieldAcBonus : 0), 'ac')}
            getModified={getModified}
          />
        </>
      )}

      {iwrPreviews && <IwrPreview previews={iwrPreviews} />}
    </div>
  )
}
