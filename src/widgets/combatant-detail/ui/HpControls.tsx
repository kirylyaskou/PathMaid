import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Swords, Plus, Shield, Heart, ChevronUp, ChevronDown, X, Skull, HeartPulse, Sparkles, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Separator } from '@/shared/ui/separator'
import { cn } from '@/shared/lib/utils'
import { useCombatantStore } from '@/entities/combatant'
import type { Combatant } from '@/entities/combatant'
import {
  applyIWR,
  createImmunity,
  createWeakness,
  createResistance,
  MATERIAL_EFFECTS,
  IMMUNITY_TYPES,
  type ConditionSlug,
  type DamageType,
  type MaterialEffect,
  type ImmunityType,
  type WeaknessType,
  type ResistanceType,
  rollDice,
  type PathbuilderBuild,
} from '@engine'
import { applyCondition, removeCondition, clearCombatantManager, getManagerState } from '@/features/combat-tracker'
import { useCombatTrackerStore } from '@/features/combat-tracker/model/store'
import { getCharacterById, loadItemOverrides } from '@/shared/api'
import { useConditionStore } from '@/entities/condition'
import { getDyingValueOnKnockout, getWoundedValueAfterStabilize } from '@engine'
import { useShallow } from 'zustand/react/shallow'
import { useRollStore } from '@/shared/model/roll-store'
import { useModifiedStats } from '@/entities/creature'
import type { CreatureStatBlockData } from '@/entities/creature'
import { toast } from 'sonner'

// CRB pg.460: when a downed creature is healed back to positive HP, only the
// Dying condition is lost. All other conditions (Wounded, Prone, Frightened, etc.) persist.

interface HpControlsProps {
  combatant: Combatant
  iwrImmunities?: string[]
  iwrWeaknesses?: { type: string; value: number }[]
  iwrResistances?: { type: string; value: number }[]
  creature?: CreatureStatBlockData | null
}

interface DamageEntry {
  damageType: DamageType
  amount: number
}

const MATERIAL_TYPE_SET = new Set(MATERIAL_EFFECTS as readonly string[])

const DAMAGE_GROUPS: { label: string; color: string; traits: DamageType[] }[] = [
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
]

const MATERIAL_GROUP = {
  label: 'Material traits',
  color: 'bg-emerald-900/60 text-emerald-200 hover:bg-emerald-800/60 data-[selected=true]:bg-emerald-400 data-[selected=true]:text-emerald-900',
  traits: ['cold-iron', 'silver', 'adamantine', 'mithral', 'magic'],
}

const CHIP_COLOR: Record<string, string> = {
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

export function HpControls({ combatant, iwrImmunities, iwrWeaknesses, iwrResistances, creature }: HpControlsProps) {
  const [hpInput, setHpInput] = useState(0)
  // Each damage type has its own amount
  const [damageEntries, setDamageEntries] = useState<DamageEntry[]>([])
  // Material traits shared across all damage instances
  const [materials, setMaterials] = useState<string[]>([])
  const [traitSelectorOpen, setTraitSelectorOpen] = useState(false)
  const updateHp = useCombatantStore((s) => s.updateHp)
  const updateTempHp = useCombatantStore((s) => s.updateTempHp)
  const updateCombatant = useCombatantStore((s) => s.updateCombatant)
  const inputRef = useRef<HTMLInputElement>(null)
  const addRoll = useRollStore((s) => s.addRoll)
  const statSlugs = useMemo(() => ['fortitude', 'reflex', 'will', 'perception', 'stealth'], [])
  const modifiedStats = useModifiedStats(combatant.id, statSlugs)
  const allCombatants = useCombatantStore(useShallow((s) => s.combatants))

  // FEAT-09: derive shield from base creature equipment OR encounter inventory
  const { combatId, isEncounterBacked } = useCombatTrackerStore(
    useShallow((s) => ({ combatId: s.combatId, isEncounterBacked: s.isEncounterBacked }))
  )
  const [encounterShieldBonus, setEncounterShieldBonus] = useState<number | null>(null)
  useEffect(() => {
    if (!isEncounterBacked || !combatId) { setEncounterShieldBonus(null); return }
    loadItemOverrides(combatId, combatant.id).then((items) => {
      const shield = items.find(
        (it) => !it.isRemoved && (it.itemType === 'shield' || it.itemName.toLowerCase().includes('shield'))
      )
      setEncounterShieldBonus(shield ? (shield.acBonus ?? 2) : null)
    }).catch(() => setEncounterShieldBonus(null))
  }, [combatId, combatant.id, isEncounterBacked])

  const { hasShield, shieldAcBonus } = useMemo(() => {
    if (encounterShieldBonus !== null) return { hasShield: true, shieldAcBonus: encounterShieldBonus }
    if (!creature?.equipment) return { hasShield: false, shieldAcBonus: 0 }
    const shield = creature.equipment.find(
      (it) => it.item_type === 'shield' || (it.item_name ?? '').toLowerCase().includes('shield'),
    )
    if (!shield) return { hasShield: false, shieldAcBonus: 0 }
    return { hasShield: true, shieldAcBonus: shield.ac_bonus ?? 2 }
  }, [creature?.equipment, encounterShieldBonus])

  // PF2e death check: dying >= (4 - doomed) = DEAD. Dead creatures cannot be healed.
  const { dyingValue, doomedValue } = useConditionStore(
    useShallow((s) => {
      const conds = s.activeConditions.filter((c) => c.combatantId === combatant.id)
      return {
        dyingValue: conds.find((c) => c.slug === 'dying')?.value ?? 0,
        doomedValue: conds.find((c) => c.slug === 'doomed')?.value ?? 0,
      }
    })
  )
  const deathThreshold = 4 - doomedValue
  const isDead = dyingValue > 0 && dyingValue >= deathThreshold

  function getModified(base: number, statSlug: string): number {
    return base + (modifiedStats.get(statSlug)?.netModifier ?? 0)
  }

  const fmt = (n: number) => (n >= 0 ? '+' + n : String(n))

  function rollStat(mod: number, label: string) {
    const formula = `1d20${mod >= 0 ? '+' : ''}${mod}`
    addRoll(rollDice(formula, label, { source: combatant.displayName }))
  }

  const stealthSkill = creature?.skills.find((s) => s.name.toLowerCase() === 'stealth')
  const baseStealth = stealthSkill?.modifier ?? null

  async function handleHide() {
    if (baseStealth === null) return
    const mod = getModified(baseStealth, 'stealth')
    const formula = `1d20${mod >= 0 ? '+' : ''}${mod}`
    const roll = rollDice(formula, 'Hide (Stealth)', { source: combatant.displayName })
    addRoll(roll)

    const pcs = allCombatants.filter((c) => !c.isNPC && !c.isHazard && c.creatureRef)
    if (pcs.length === 0) return

    const pcResults: { name: string; perceptionDC: number }[] = []
    for (const pc of pcs) {
      try {
        const record = await getCharacterById(pc.creatureRef)
        if (!record) continue
        const build = JSON.parse(record.rawJson) as PathbuilderBuild
        const abilityMod = Math.floor((build.abilities.wis - 10) / 2)
        const percMod =
          build.proficiencies.perception > 0
            ? abilityMod + build.level + build.proficiencies.perception
            : abilityMod
        pcResults.push({ name: pc.displayName, perceptionDC: 10 + percMod })
      } catch { /* skip */ }
    }
    if (pcResults.length === 0) return

    const sees = pcResults.filter((p) => roll.total < p.perceptionDC).map((p) => p.name)
    const doesntSee = pcResults.filter((p) => roll.total >= p.perceptionDC).map((p) => p.name)

    toast(`Hide: ${roll.total}`, {
      description: [
        sees.length > 0 ? `Видят: ${sees.join(', ')}` : null,
        doesntSee.length > 0 ? `Не видят: ${doesntSee.join(', ')}` : null,
      ].filter(Boolean).join(' | '),
      duration: 6000,
    })
  }

  // Stabilize: remove dying, apply wounded +1, creature stays at 0 HP unconscious/prone.
  // CRB: stabilize only stops the dying process. Creature remains unconscious with all
  // cascade conditions (unconscious, prone, blinded, off-guard) intact.
  // Problem: removeCondition('dying') cascade-removes dying's grantees (unconscious,
  // which in turn removes blinded + off-guard). We snapshot and re-apply them.
  const handleStabilize = useCallback(() => {
    // 1. Apply wounded +1 before removing dying
    const curWounded = useConditionStore.getState().activeConditions
      .find((c) => c.combatantId === combatant.id && c.slug === 'wounded')?.value ?? 0
    const newWounded = getWoundedValueAfterStabilize(curWounded)
    applyCondition(combatant.id, 'wounded' as ConditionSlug, newWounded)

    // 2. Snapshot cascade conditions that must survive stabilization
    const CASCADE_PRESERVE: ConditionSlug[] = ['unconscious', 'prone', 'blinded', 'off-guard'] as ConditionSlug[]
    const managerState = getManagerState(combatant.id)
    const preserveSet = new Map<ConditionSlug, number>()
    for (const slug of CASCADE_PRESERVE) {
      const cond = managerState.find((c) => c.slug === slug)
      if (cond) preserveSet.set(slug, cond.value)
    }

    // 3. Remove dying — this cascade-removes unconscious -> blinded, off-guard
    //    (prone is already preserved by condition-bridge)
    removeCondition(combatant.id, 'dying' as ConditionSlug)

    // 4. Re-apply any cascade conditions that were lost
    const afterState = getManagerState(combatant.id)
    const afterSlugs = new Set(afterState.map((c) => c.slug))
    for (const [slug, value] of preserveSet) {
      if (!afterSlugs.has(slug)) {
        applyCondition(combatant.id, slug, value)
      }
    }
  }, [combatant.id])

  // Resurrect: clear ALL conditions, set HP to 1 (GM fiat / magical resurrection).
  const handleResurrect = useCallback(() => {
    clearCombatantManager(combatant.id)
    updateHp(combatant.id, 1 - combatant.hp)
  }, [combatant.id, combatant.hp, updateHp])

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
    setMaterials((prev) =>
      prev.includes(trait) ? prev.filter((t) => t !== trait) : [...prev, trait]
    )
  }, [])

  const updateEntryAmount = useCallback((damageType: DamageType, amount: number) => {
    setDamageEntries((prev) =>
      prev.map((e) => (e.damageType === damageType ? { ...e, amount } : e))
    )
  }, [])

  const removeEntry = useCallback((damageType: DamageType) => {
    setDamageEntries((prev) => prev.filter((e) => e.damageType !== damageType))
  }, [])

  const mats = useMemo(
    () => materials.filter((t) => MATERIAL_TYPE_SET.has(t)) as MaterialEffect[],
    [materials]
  )

  const iwrPreviews = useMemo(() => {
    if (!iwrImmunities?.length && !iwrWeaknesses?.length && !iwrResistances?.length) return null

    const activeEntries = damageEntries.filter((e) => e.amount > 0)
    if (activeEntries.length === 0) {
      // Untyped — no IWR applies
      return null
    }

    const immunities = (iwrImmunities || [])
      .filter((t) => (IMMUNITY_TYPES as readonly string[]).includes(t))
      .map((t) => createImmunity(t as ImmunityType))
    const weaknesses = (iwrWeaknesses || []).map((w) =>
      createWeakness(w.type as WeaknessType, w.value)
    )
    const resistances = (iwrResistances || []).map((r) =>
      createResistance(r.type as ResistanceType, r.value)
    )

    return activeEntries.map(({ damageType, amount }) => {
      const result = applyIWR(
        { type: damageType, amount, materials: mats },
        immunities,
        weaknesses,
        resistances,
      )
      return { type: damageType, amount, result }
    })
  }, [damageEntries, mats, iwrImmunities, iwrWeaknesses, iwrResistances])

  const handleAction = useCallback(
    (action: 'damage' | 'heal' | 'tempHp') => {
      if (action === 'damage') {
        if (!canDamage) return
        const effectiveDamage = iwrPreviews
          ? iwrPreviews.reduce((sum, p) => sum + p.result.finalDamage, 0)
          : hasEntries
            ? totalTypedDamage
            : hpInput
        let remaining = effectiveDamage
        if (combatant.tempHp > 0) {
          const absorbed = Math.min(combatant.tempHp, remaining)
          updateTempHp(combatant.id, combatant.tempHp - absorbed)
          remaining -= absorbed
        }
        const hpBefore = combatant.hp
        if (remaining > 0) updateHp(combatant.id, -remaining)
        const newHp = Math.max(0, hpBefore - remaining)
        // CRB: on HP → 0 auto-apply dying (1 + wounded). No dialog — recovery check at start of turn.
        if (newHp === 0 && hpBefore > 0) {
          const wounded = useConditionStore.getState().activeConditions
            .find((c) => c.combatantId === combatant.id && c.slug === 'wounded')?.value ?? 0
          applyCondition(combatant.id, 'dying' as ConditionSlug, getDyingValueOnKnockout(wounded))
        }
        setDamageEntries([])
        setMaterials([])
        if (!hasEntries) setHpInput(0)
      } else {
        if (hpInput <= 0) return
        if (action === 'heal') {
          const wasDown = combatant.hp <= 0
          updateHp(combatant.id, hpInput)
          // If healing brings a downed creature back to positive HP, clear
          // all conditions except Wounded and Prone (CRB pg.460).
          if (wasDown && combatant.hp + hpInput > 0) {
            // CRB pg.460: losing dying grants/increases wounded.
            const curWounded = useConditionStore.getState().activeConditions
              .find((c) => c.combatantId === combatant.id && c.slug === 'wounded')?.value ?? 0
            const newWounded = getWoundedValueAfterStabilize(curWounded)
            applyCondition(combatant.id, 'wounded' as ConditionSlug, newWounded)
            // Remove dying (cascades: unconscious, blinded, off-guard removed;
            // prone is preserved by condition-bridge).
            removeCondition(combatant.id, 'dying' as ConditionSlug)
          }
        } else {
          updateTempHp(combatant.id, Math.max(combatant.tempHp, hpInput))
        }
        setHpInput(0)
      }
    },
    [hpInput, canDamage, hasEntries, totalTypedDamage, iwrPreviews, combatant, updateHp, updateTempHp],
  )

  const stepValue = (delta: number) => setHpInput((prev) => Math.max(0, prev + delta))

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setHpInput((prev) => Math.max(0, prev + (e.deltaY < 0 ? 1 : -1)))
  }, [])

  const hpPercent = combatant.maxHp > 0 ? (combatant.hp / combatant.maxHp) * 100 : 0

  return (
    <div className="space-y-3">
      {/* HP bar */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Heart className="w-4 h-4 text-destructive" />
          <span className="text-lg font-mono font-bold">
            {combatant.hp}
            <span className="text-muted-foreground font-normal"> / {combatant.maxHp}</span>
          </span>
          {combatant.tempHp > 0 && (
            <span className="text-sm font-mono text-blue-400 flex items-center gap-0.5">
              <Shield className="w-3 h-3" />+{combatant.tempHp}
            </span>
          )}
          <div className="flex-1" />
          {/* FEAT-09: Raise Shield toggle — only visible when the creature carries a shield */}
          {hasShield && (
            <button
              type="button"
              onClick={() => updateCombatant(combatant.id, { shieldRaised: !combatant.shieldRaised })}
              title={`Toggle Raise Shield (+${shieldAcBonus} AC)`}
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors',
                combatant.shieldRaised
                  ? 'bg-amber-700/40 text-amber-200 border border-amber-600/50'
                  : 'hover:bg-muted/50 text-muted-foreground border border-transparent',
              )}
            >
              <Shield className="w-3 h-3" />
              {combatant.shieldRaised ? `Shield Raised (+${shieldAcBonus} AC)` : 'Raise Shield'}
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
        /* Dead creature — no HP controls, only status indicator + stabilize/resurrect */
        <div className="flex flex-col items-center gap-3 py-4 rounded border border-destructive/30 bg-destructive/10">
          <Skull className="w-10 h-10 text-destructive" />
          <p className="text-lg font-bold text-destructive">DEAD</p>
          <p className="text-xs text-muted-foreground">
            Dying {dyingValue} reached death threshold ({deathThreshold})
          </p>
          <div className="flex gap-2 w-full px-4">
            <Button
              variant="secondary"
              className="flex-1 h-8 text-xs gap-1.5 bg-emerald-900/50 hover:bg-emerald-900/70 text-emerald-300"
              onClick={handleResurrect}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Resurrect
            </Button>
          </div>
        </div>
      ) : (
      <div className="flex flex-col gap-1">
        {/* Damage button — full width */}
        <Button
          variant="destructive"
          className="h-9 text-xs justify-start gap-1.5 w-full"
          onClick={() => handleAction('damage')}
          disabled={!canDamage}
        >
          <Swords className="w-3.5 h-3.5" />
          Damage
          {hasEntries && totalTypedDamage > 0 && (
            <span className="ml-auto font-mono opacity-80">{totalTypedDamage}</span>
          )}
        </Button>

        {/* Damage entries area — full width */}
        <div className="min-h-7 w-full flex flex-wrap items-center gap-1 px-2 py-1 rounded border border-border/50 bg-secondary/20">
          {!hasEntries && materials.length === 0 && (
            <span className="text-xs text-muted-foreground">Untyped</span>
          )}

          {/* Typed entries: [chip][amount][×] */}
          {damageEntries.map((entry) => (
            <div key={entry.damageType} className="flex items-center gap-0.5">
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-l capitalize ${CHIP_COLOR[entry.damageType] ?? 'bg-muted text-muted-foreground'}`}
              >
                {entry.damageType}
              </span>
              <input
                type="number"
                value={entry.amount || ''}
                onChange={(e) =>
                  updateEntryAmount(entry.damageType, Math.max(0, parseInt(e.target.value, 10) || 0))
                }
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

          {/* Material chips (no amount) */}
          {materials.map((m) => (
            <div key={m} className="flex items-center gap-0.5">
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-l capitalize ${CHIP_COLOR[m] ?? 'bg-muted text-muted-foreground'}`}
              >
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
            + traits
          </button>
        </div>

        {/* Heal / TempHP row — stepper here controls these (and untyped damage above) */}
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
              onKeyDown={(e) => e.key === 'Enter' && handleAction('damage')}
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
            onClick={() => handleAction('heal')}
            disabled={hpInput <= 0}
          >
            <Plus className="w-3 h-3" />
            Heal
          </Button>
          <Button
            variant="secondary"
            className="h-full text-xs justify-start gap-1.5 flex-1 bg-blue-900/50 hover:bg-blue-900/70 text-blue-300"
            onClick={() => handleAction('tempHp')}
            disabled={hpInput <= 0}
          >
            <Shield className="w-3 h-3" />
            Temp HP
          </Button>
        </div>

        {/* Stabilize — only when creature is dying but not yet dead */}
        {dyingValue > 0 && (
          <Button
            variant="secondary"
            className="h-8 text-xs justify-start gap-1.5 w-full bg-amber-900/50 hover:bg-amber-900/70 text-amber-300"
            onClick={handleStabilize}
          >
            <HeartPulse className="w-3.5 h-3.5" />
            Stabilize
          </Button>
        )}
      </div>
      )}

      {/* Trait selector dialog */}
      <Dialog modal={false} open={traitSelectorOpen} onOpenChange={setTraitSelectorOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Add Damage Traits</span>
              {(damageEntries.length > 0 || materials.length > 0) && (
                <button
                  onClick={() => { setDamageEntries([]); setMaterials([]) }}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 font-normal"
                >
                  <X className="w-3 h-3" />
                  Clear all
                </button>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            {DAMAGE_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {group.traits.map((trait) => {
                    const active = damageEntries.some((e) => e.damageType === trait)
                    return (
                      <button
                        key={trait}
                        data-selected={active}
                        onClick={() => toggleDamageType(trait)}
                        className={`text-xs px-2.5 py-1 rounded-full capitalize transition-colors ${group.color}`}
                      >
                        {trait}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Separator */}
            <div className="border-t border-border/30 pt-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                {MATERIAL_GROUP.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {MATERIAL_GROUP.traits.map((trait) => {
                  const active = materials.includes(trait)
                  return (
                    <button
                      key={trait}
                      data-selected={active}
                      onClick={() => toggleMaterial(trait)}
                      className={`text-xs px-2.5 py-1 rounded-full capitalize transition-colors ${MATERIAL_GROUP.color}`}
                    >
                      {trait}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AC, saves, seek, hide */}
      {creature && (
        <>
          <Separator />
          {/* AC */}
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">AC</span>
            <span className="text-lg font-mono font-bold">
              {creature.ac + (combatant.shieldRaised ? shieldAcBonus : 0)}
            </span>
          </div>
          {/* Saves */}
          <div className="flex gap-1">
            {[
              { label: 'Fort', slug: 'fortitude', base: creature.fort },
              { label: 'Ref', slug: 'reflex', base: creature.ref },
              { label: 'Will', slug: 'will', base: creature.will },
            ].map(({ label, slug, base }) => {
              const mod = getModified(base, slug)
              return (
                <Button
                  key={slug}
                  variant="secondary"
                  className="flex-1 h-7 text-xs gap-1"
                  onClick={() =>
                    rollStat(
                      mod,
                      label === 'Fort' ? 'Fortitude' : label === 'Ref' ? 'Reflex' : 'Will',
                    )
                  }
                >
                  {label} <span className="font-mono">{fmt(mod)}</span>
                </Button>
              )
            })}
          </div>
          {/* Seek + Hide */}
          <div className="flex gap-1">
            <Button
              variant="secondary"
              className="flex-1 h-7 text-xs gap-1"
              onClick={() =>
                rollStat(getModified(creature.perception, 'perception'), 'Seek (Perception)')
              }
            >
              <Eye className="w-3 h-3" />
              Seek{' '}
              <span className="font-mono">
                {fmt(getModified(creature.perception, 'perception'))}
              </span>
            </Button>
            {baseStealth !== null && (
              <Button
                variant="secondary"
                className="flex-1 h-7 text-xs gap-1"
                onClick={() => void handleHide()}
              >
                <EyeOff className="w-3 h-3" />
                Hide <span className="font-mono">{fmt(getModified(baseStealth, 'stealth'))}</span>
              </Button>
            )}
          </div>
        </>
      )}

      {/* IWR preview */}
      {iwrPreviews && iwrPreviews.length > 0 && (
        <div className="text-xs space-y-0.5 px-2 py-1.5 rounded bg-secondary/30 border border-border/30">
          {iwrPreviews.map(({ type, amount, result }) => (
            <div key={type} className="space-y-0.5">
              <div className="flex justify-between text-muted-foreground/70 text-[10px]">
                <span className="capitalize">{type}</span>
                <span className="font-mono">{amount} raw</span>
              </div>
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
                  <span className="font-mono">
                    +{result.appliedWeaknesses.reduce((s, w) => s + w.value, 0)}
                  </span>
                </div>
              )}
              {result.appliedResistances.length > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>
                    Resist ({result.appliedResistances.map((r) => `${r.type} ${r.value}`).join(', ')})
                  </span>
                  <span className="font-mono">
                    -{result.appliedResistances.reduce((s, r) => s + r.value, 0)}
                  </span>
                </div>
              )}
            </div>
          ))}
          <div className="flex justify-between font-bold border-t border-border/30 pt-0.5">
            <span>{iwrPreviews.length > 1 ? 'Total final' : 'Final'}</span>
            <span className="font-mono">
              {iwrPreviews.reduce((s, p) => s + p.result.finalDamage, 0)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
