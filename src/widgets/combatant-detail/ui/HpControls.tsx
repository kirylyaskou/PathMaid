import { useState, useCallback, useMemo } from 'react'
import { Plus, Minus, Shield, Heart, ChevronDown } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Popover, PopoverTrigger, PopoverContent } from '@/shared/ui/popover'
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandGroup,
  CommandEmpty,
} from '@/shared/ui/command'
import { useCombatantStore } from '@/entities/combatant'
import type { Combatant } from '@/entities/combatant'
import {
  applyIWR,
  createImmunity,
  createWeakness,
  createResistance,
  DAMAGE_TYPES,
  type DamageType,
  type ImmunityType,
  type WeaknessType,
  type ResistanceType,
} from '@engine'

interface HpControlsProps {
  combatant: Combatant
  iwrImmunities?: string[]
  iwrWeaknesses?: { type: string; value: number }[]
  iwrResistances?: { type: string; value: number }[]
}

const DAMAGE_TYPE_GROUPS: { label: string; types: DamageType[] }[] = [
  { label: 'Physical', types: ['bludgeoning', 'piercing', 'slashing', 'bleed'] },
  { label: 'Energy', types: ['acid', 'cold', 'electricity', 'fire', 'sonic'] },
  { label: 'Alignment', types: ['holy', 'unholy'] },
  { label: 'Other', types: ['force', 'mental', 'poison', 'spirit', 'vitality', 'void', 'untyped'] },
]

export function HpControls({ combatant, iwrImmunities, iwrWeaknesses, iwrResistances }: HpControlsProps) {
  const [damageInput, setDamageInput] = useState('')
  const [healInput, setHealInput] = useState('')
  const [tempHpInput, setTempHpInput] = useState('')
  const [damageType, setDamageType] = useState<DamageType | null>(null)
  const [typeOpen, setTypeOpen] = useState(false)
  const { updateHp, updateTempHp } = useCombatantStore()

  const iwrPreview = useMemo(() => {
    if (!damageType || !damageInput) return null
    const amount = parseInt(damageInput, 10)
    if (isNaN(amount) || amount <= 0) return null

    const immunities = (iwrImmunities || [])
      .filter((t) => (DAMAGE_TYPES as readonly string[]).includes(t))
      .map((t) => createImmunity(t as ImmunityType))
    const weaknesses = (iwrWeaknesses || []).map((w) =>
      createWeakness(w.type as WeaknessType, w.value)
    )
    const resistances = (iwrResistances || []).map((r) =>
      createResistance(r.type as ResistanceType, r.value)
    )

    if (immunities.length === 0 && weaknesses.length === 0 && resistances.length === 0)
      return null

    return applyIWR({ type: damageType, amount }, immunities, weaknesses, resistances)
  }, [damageType, damageInput, iwrImmunities, iwrWeaknesses, iwrResistances])

  const handleDamage = useCallback(() => {
    const amount = parseInt(damageInput, 10)
    if (isNaN(amount) || amount <= 0) return

    const effectiveDamage = iwrPreview ? iwrPreview.finalDamage : amount
    let remaining = effectiveDamage
    if (combatant.tempHp > 0) {
      const absorbed = Math.min(combatant.tempHp, remaining)
      updateTempHp(combatant.id, combatant.tempHp - absorbed)
      remaining -= absorbed
    }
    if (remaining > 0) {
      updateHp(combatant.id, -remaining)
    }
    setDamageInput('')
    setDamageType(null)
  }, [damageInput, iwrPreview, combatant, updateHp, updateTempHp])

  const handleHeal = useCallback(() => {
    const amount = parseInt(healInput, 10)
    if (isNaN(amount) || amount <= 0) return
    updateHp(combatant.id, amount)
    setHealInput('')
  }, [healInput, combatant.id, updateHp])

  const handleSetTempHp = useCallback(() => {
    const amount = parseInt(tempHpInput, 10)
    if (isNaN(amount) || amount < 0) return
    updateTempHp(combatant.id, Math.max(combatant.tempHp, amount))
    setTempHpInput('')
  }, [tempHpInput, combatant, updateTempHp])

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

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Damage</label>
          <div className="flex gap-1">
            <Input
              type="number"
              value={damageInput}
              onChange={(e) => setDamageInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDamage()}
              placeholder="0"
              className="h-7 text-xs"
              min={0}
            />
            <Button
              size="icon"
              variant="destructive"
              className="h-7 w-7 shrink-0"
              onClick={handleDamage}
              disabled={!damageInput}
            >
              <Minus className="w-3 h-3" />
            </Button>
          </div>
          <Popover open={typeOpen} onOpenChange={setTypeOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded border border-border/50 bg-secondary/30 text-muted-foreground hover:bg-secondary/50 w-full">
                <span className="truncate flex-1 text-left">
                  {damageType ? damageType : 'Untyped'}
                </span>
                <ChevronDown className="w-2.5 h-2.5 shrink-0" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-0" align="start">
              <Command>
                <CommandInput placeholder="Damage type..." className="h-8 text-xs" />
                <CommandList>
                  <CommandEmpty>No type found</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="untyped-clear"
                      onSelect={() => { setDamageType(null); setTypeOpen(false) }}
                    >
                      Untyped
                    </CommandItem>
                  </CommandGroup>
                  {DAMAGE_TYPE_GROUPS.map((g) => (
                    <CommandGroup key={g.label} heading={g.label}>
                      {g.types.map((t) => (
                        <CommandItem
                          key={t}
                          value={t}
                          onSelect={() => { setDamageType(t); setTypeOpen(false) }}
                        >
                          {t}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Heal</label>
          <div className="flex gap-1">
            <Input
              type="number"
              value={healInput}
              onChange={(e) => setHealInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleHeal()}
              placeholder="0"
              className="h-7 text-xs"
              min={0}
            />
            <Button
              size="icon"
              variant="secondary"
              className="h-7 w-7 shrink-0 bg-emerald-900/50 hover:bg-emerald-900/70 text-emerald-300"
              onClick={handleHeal}
              disabled={!healInput}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Temp HP</label>
          <div className="flex gap-1">
            <Input
              type="number"
              value={tempHpInput}
              onChange={(e) => setTempHpInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSetTempHp()}
              placeholder="0"
              className="h-7 text-xs"
              min={0}
            />
            <Button
              size="icon"
              variant="secondary"
              className="h-7 w-7 shrink-0 bg-blue-900/50 hover:bg-blue-900/70 text-blue-300"
              onClick={handleSetTempHp}
              disabled={!tempHpInput}
            >
              <Shield className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {iwrPreview && (
        <div className="text-xs space-y-0.5 px-2 py-1.5 rounded bg-secondary/30 border border-border/30">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Raw</span>
            <span className="font-mono">{damageInput}</span>
          </div>
          {iwrPreview.appliedImmunities.length > 0 && (
            <div className="flex justify-between text-blue-400">
              <span>Immune ({iwrPreview.appliedImmunities.map((i) => i.type).join(', ')})</span>
              <span className="font-mono">&rarr; 0</span>
            </div>
          )}
          {iwrPreview.appliedWeaknesses.length > 0 && (
            <div className="flex justify-between text-red-400">
              <span>
                Weakness ({iwrPreview.appliedWeaknesses.map((w) => `${w.type} ${w.value}`).join(', ')})
              </span>
              <span className="font-mono">+{iwrPreview.appliedWeaknesses[0].value}</span>
            </div>
          )}
          {iwrPreview.appliedResistances.length > 0 && (
            <div className="flex justify-between text-green-400">
              <span>
                Resist ({iwrPreview.appliedResistances.map((r) => `${r.type} ${r.value}`).join(', ')})
              </span>
              <span className="font-mono">-{iwrPreview.appliedResistances[0].value}</span>
            </div>
          )}
          <div className="flex justify-between font-bold border-t border-border/30 pt-0.5">
            <span>Final</span>
            <span className="font-mono">{iwrPreview.finalDamage}</span>
          </div>
        </div>
      )}
    </div>
  )
}
