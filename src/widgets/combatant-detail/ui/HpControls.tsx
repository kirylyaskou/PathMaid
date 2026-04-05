import { useState, useCallback, useMemo, useRef } from 'react'
import { Swords, Plus, Shield, Heart, ChevronUp, ChevronDown, X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { useCombatantStore } from '@/entities/combatant'
import type { Combatant } from '@/entities/combatant'
import {
  applyIWR,
  createImmunity,
  createWeakness,
  createResistance,
  DAMAGE_TYPES,
  MATERIAL_EFFECTS,
  IMMUNITY_TYPES,
  type DamageType,
  type MaterialEffect,
  type ImmunityType,
  type WeaknessType,
  type ResistanceType,
} from '@engine'
import { DyingCascadeDialog } from './DyingCascadeDialog'

interface HpControlsProps {
  combatant: Combatant
  iwrImmunities?: string[]
  iwrWeaknesses?: { type: string; value: number }[]
  iwrResistances?: { type: string; value: number }[]
  abilities?: { name: string; description: string }[]
}

const DAMAGE_TYPE_SET = new Set(DAMAGE_TYPES as readonly string[])
const MATERIAL_TYPE_SET = new Set(MATERIAL_EFFECTS as readonly string[])

const TRAIT_GROUPS: { label: string; color: string; traits: string[] }[] = [
  {
    label: 'Physical',
    color: 'bg-slate-700 text-slate-200 hover:bg-slate-600 data-[selected=true]:bg-slate-400 data-[selected=true]:text-slate-900',
    traits: ['bludgeoning', 'piercing', 'slashing', 'bleed'],
  },
  {
    label: 'Energy',
    color: 'bg-amber-900/60 text-amber-200 hover:bg-amber-800/60 data-[selected=true]:bg-amber-400 data-[selected=true]:text-amber-900',
    traits: ['acid', 'cold', 'electricity', 'fire', 'sonic', 'force', 'vitality', 'void'],
  },
  {
    label: 'Alignment',
    color: 'bg-violet-900/60 text-violet-200 hover:bg-violet-800/60 data-[selected=true]:bg-violet-400 data-[selected=true]:text-violet-900',
    traits: ['holy', 'unholy'],
  },
  {
    label: 'Other',
    color: 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600 data-[selected=true]:bg-zinc-400 data-[selected=true]:text-zinc-900',
    traits: ['spirit', 'mental', 'poison', 'untyped'],
  },
  {
    label: 'Material',
    color: 'bg-emerald-900/60 text-emerald-200 hover:bg-emerald-800/60 data-[selected=true]:bg-emerald-400 data-[selected=true]:text-emerald-900',
    traits: ['cold-iron', 'silver', 'adamantine', 'mithral', 'magic'],
  },
]

// Chip color for display in the trigger (selected traits)
const TRAIT_CHIP_COLOR: Record<string, string> = {
  bludgeoning: 'bg-slate-600 text-slate-100',
  piercing: 'bg-slate-600 text-slate-100',
  slashing: 'bg-slate-600 text-slate-100',
  bleed: 'bg-slate-600 text-slate-100',
  acid: 'bg-amber-800/80 text-amber-200',
  cold: 'bg-amber-800/80 text-amber-200',
  electricity: 'bg-amber-800/80 text-amber-200',
  fire: 'bg-amber-800/80 text-amber-200',
  sonic: 'bg-amber-800/80 text-amber-200',
  force: 'bg-amber-800/80 text-amber-200',
  vitality: 'bg-amber-800/80 text-amber-200',
  void: 'bg-amber-800/80 text-amber-200',
  holy: 'bg-violet-800/80 text-violet-200',
  unholy: 'bg-violet-800/80 text-violet-200',
  spirit: 'bg-zinc-600 text-zinc-200',
  mental: 'bg-zinc-600 text-zinc-200',
  poison: 'bg-zinc-600 text-zinc-200',
  untyped: 'bg-zinc-600 text-zinc-200',
  'cold-iron': 'bg-emerald-800/80 text-emerald-200',
  silver: 'bg-emerald-800/80 text-emerald-200',
  adamantine: 'bg-emerald-800/80 text-emerald-200',
  mithral: 'bg-emerald-800/80 text-emerald-200',
  magic: 'bg-emerald-800/80 text-emerald-200',
}

export function HpControls({ combatant, iwrImmunities, iwrWeaknesses, iwrResistances, abilities }: HpControlsProps) {
  const [hpInput, setHpInput] = useState(0)
  const [selectedTraits, setSelectedTraits] = useState<string[]>([])
  const [traitSelectorOpen, setTraitSelectorOpen] = useState(false)
  const [dyingDialogOpen, setDyingDialogOpen] = useState(false)
  const updateHp = useCombatantStore((s) => s.updateHp)
  const updateTempHp = useCombatantStore((s) => s.updateTempHp)
  const inputRef = useRef<HTMLInputElement>(null)

  const toggleTrait = useCallback((trait: string) => {
    setSelectedTraits((prev) =>
      prev.includes(trait) ? prev.filter((t) => t !== trait) : [...prev, trait]
    )
  }, [])

  const iwrPreviews = useMemo(() => {
    if (hpInput <= 0 || selectedTraits.length === 0) return null
    if (!iwrImmunities?.length && !iwrWeaknesses?.length && !iwrResistances?.length) return null

    const damageTypes = selectedTraits.filter((t) => DAMAGE_TYPE_SET.has(t)) as DamageType[]
    const materials = selectedTraits.filter((t) => MATERIAL_TYPE_SET.has(t)) as MaterialEffect[]

    if (damageTypes.length === 0) return null

    const immunities = (iwrImmunities || [])
      .filter((t) => (IMMUNITY_TYPES as readonly string[]).includes(t))
      .map((t) => createImmunity(t as ImmunityType))
    const weaknesses = (iwrWeaknesses || []).map((w) =>
      createWeakness(w.type as WeaknessType, w.value)
    )
    const resistances = (iwrResistances || []).map((r) =>
      createResistance(r.type as ResistanceType, r.value)
    )

    const baseAmount = Math.floor(hpInput / damageTypes.length)
    const remainder = hpInput - baseAmount * damageTypes.length

    return damageTypes.map((type, i) => {
      const amount = baseAmount + (i === 0 ? remainder : 0)
      const result = applyIWR({ type, amount, materials }, immunities, weaknesses, resistances)
      return { type, amount, result }
    })
  }, [selectedTraits, hpInput, iwrImmunities, iwrWeaknesses, iwrResistances])

  const handleAction = useCallback((action: 'damage' | 'heal' | 'tempHp') => {
    if (hpInput <= 0) return

    if (action === 'damage') {
      const effectiveDamage = iwrPreviews
        ? iwrPreviews.reduce((sum, p) => sum + p.result.finalDamage, 0)
        : hpInput
      let remaining = effectiveDamage
      if (combatant.tempHp > 0) {
        const absorbed = Math.min(combatant.tempHp, remaining)
        updateTempHp(combatant.id, combatant.tempHp - absorbed)
        remaining -= absorbed
      }
      const hpBefore = combatant.hp
      if (remaining > 0) {
        updateHp(combatant.id, -remaining)
      }
      const newHp = Math.max(0, hpBefore - remaining)
      if (newHp === 0 && hpBefore > 0) {
        setDyingDialogOpen(true)
      }
      setSelectedTraits([])
    } else if (action === 'heal') {
      updateHp(combatant.id, hpInput)
    } else if (action === 'tempHp') {
      updateTempHp(combatant.id, Math.max(combatant.tempHp, hpInput))
    }

    setHpInput(0)
  }, [hpInput, iwrPreviews, combatant, updateHp, updateTempHp])

  const stepValue = (delta: number) => {
    setHpInput((prev) => Math.max(0, prev + delta))
  }

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setHpInput((prev) => Math.max(0, prev + (e.deltaY < 0 ? 1 : -1)))
  }, [])

  const hpPercent = combatant.maxHp > 0 ? (combatant.hp / combatant.maxHp) * 100 : 0

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-destructive" />
          <span className="text-lg font-mono font-bold">
            {combatant.hp}
            <span className="text-muted-foreground font-normal"> / {combatant.maxHp}</span>
          </span>
          {combatant.tempHp > 0 && (
            <span className="text-sm font-mono text-blue-400 flex items-center gap-0.5">
              <Shield className="w-3 h-3" />
              +{combatant.tempHp}
            </span>
          )}
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              hpPercent > 50 ? 'bg-emerald-500' :
              hpPercent > 25 ? 'bg-amber-500' : 'bg-destructive'
            }`}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        {/* Stepper input */}
        <div className="flex flex-col items-center">
          <button
            className="h-5 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-t transition-colors"
            onClick={() => stepValue(1)}
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <input
            ref={inputRef}
            type="number"
            value={hpInput || ''}
            onChange={(e) => setHpInput(Math.max(0, parseInt(e.target.value, 10) || 0))}
            onKeyDown={(e) => e.key === 'Enter' && handleAction('damage')}
            onWheel={handleWheel}
            placeholder="0"
            className="w-10 h-10 text-center text-lg font-mono font-bold bg-secondary/30 border border-border/50 rounded focus:outline-none focus:ring-1 focus:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            min={0}
          />
          <button
            className="h-5 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-b transition-colors"
            onClick={() => stepValue(-1)}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-1 flex-1">
          {/* Damage row */}
          <Button
            variant="destructive"
            className="h-9 text-xs justify-start gap-1.5 w-full"
            onClick={() => handleAction('damage')}
            disabled={hpInput <= 0}
          >
            <Swords className="w-3.5 h-3.5" />
            Damage
          </Button>

          {/* Trait selector trigger */}
          <button
            onClick={() => setTraitSelectorOpen(true)}
            className="min-h-7 w-full flex flex-wrap items-center gap-1 px-2 py-1 rounded border border-border/50 bg-secondary/20 hover:bg-secondary/40 text-left transition-colors"
          >
            {selectedTraits.length === 0 ? (
              <span className="text-xs text-muted-foreground">Untyped</span>
            ) : (
              selectedTraits.map((t) => (
                <span
                  key={t}
                  className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded capitalize ${TRAIT_CHIP_COLOR[t] ?? 'bg-muted text-muted-foreground'}`}
                >
                  {t}
                </span>
              ))
            )}
          </button>

          {/* Heal + TempHP row */}
          <div className="flex gap-1">
            <Button
              variant="secondary"
              className="h-7 text-xs justify-start gap-1.5 flex-1 bg-emerald-900/50 hover:bg-emerald-900/70 text-emerald-300"
              onClick={() => handleAction('heal')}
              disabled={hpInput <= 0}
            >
              <Plus className="w-3 h-3" />
              Heal
            </Button>
            <Button
              variant="secondary"
              className="h-7 text-xs justify-start gap-1.5 flex-1 bg-blue-900/50 hover:bg-blue-900/70 text-blue-300"
              onClick={() => handleAction('tempHp')}
              disabled={hpInput <= 0}
            >
              <Shield className="w-3 h-3" />
              Temp HP
            </Button>
          </div>
        </div>
      </div>

      {/* Trait selector dialog */}
      <Dialog open={traitSelectorOpen} onOpenChange={setTraitSelectorOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Damage Traits</span>
              {selectedTraits.length > 0 && (
                <button
                  onClick={() => setSelectedTraits([])}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 font-normal"
                >
                  <X className="w-3 h-3" />
                  Clear all
                </button>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            {TRAIT_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {group.traits.map((trait) => {
                    const active = selectedTraits.includes(trait)
                    return (
                      <button
                        key={trait}
                        data-selected={active}
                        onClick={() => toggleTrait(trait)}
                        className={`text-xs px-2.5 py-1 rounded-full capitalize transition-colors ${group.color}`}
                      >
                        {trait}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <DyingCascadeDialog
        open={dyingDialogOpen}
        onClose={() => setDyingDialogOpen(false)}
        combatantId={combatant.id}
        combatantName={combatant.displayName}
        abilities={abilities}
      />

      {iwrPreviews && iwrPreviews.length > 0 && (
        <div className="text-xs space-y-0.5 px-2 py-1.5 rounded bg-secondary/30 border border-border/30">
          {iwrPreviews.map(({ type, amount, result }) => (
            <div key={type} className="space-y-0.5">
              {iwrPreviews.length > 1 && (
                <div className="flex justify-between text-muted-foreground/70 text-[10px]">
                  <span className="capitalize">{type}</span>
                  <span className="font-mono">{amount} raw</span>
                </div>
              )}
              {iwrPreviews.length === 1 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Raw</span>
                  <span className="font-mono">{amount}</span>
                </div>
              )}
              {result.appliedImmunities.length > 0 && (
                <div className="flex justify-between text-blue-400">
                  <span>Immune ({result.appliedImmunities.map((i) => i.type).join(', ')})</span>
                  <span className="font-mono">&rarr; 0</span>
                </div>
              )}
              {result.appliedWeaknesses.length > 0 && (
                <div className="flex justify-between text-red-400">
                  <span>
                    Weakness ({result.appliedWeaknesses.map((w) => `${w.type} ${w.value}`).join(', ')})
                  </span>
                  <span className="font-mono">+{result.appliedWeaknesses.reduce((s, w) => s + w.value, 0)}</span>
                </div>
              )}
              {result.appliedResistances.length > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>
                    Resist ({result.appliedResistances.map((r) => `${r.type} ${r.value}`).join(', ')})
                  </span>
                  <span className="font-mono">-{result.appliedResistances.reduce((s, r) => s + r.value, 0)}</span>
                </div>
              )}
            </div>
          ))}
          {iwrPreviews.length > 1 && (
            <div className="flex justify-between font-bold border-t border-border/30 pt-0.5">
              <span>Total final</span>
              <span className="font-mono">{iwrPreviews.reduce((s, p) => s + p.result.finalDamage, 0)}</span>
            </div>
          )}
          {iwrPreviews.length === 1 && (
            <div className="flex justify-between font-bold border-t border-border/30 pt-0.5">
              <span>Final</span>
              <span className="font-mono">{iwrPreviews[0].result.finalDamage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
