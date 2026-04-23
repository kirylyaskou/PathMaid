import { useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible'
import { LevelBadge } from '@/shared/ui/level-badge'
import { cn } from '@/shared/lib/utils'
import { ChevronDown } from 'lucide-react'
import { useCombatantStore } from '@/entities/combatant'
import type { Combatant } from '@/entities/combatant'
import { splitByAllegiance } from '../lib/allegiance'
import { classifyEffectKind, type EffectKind } from '../lib/default-selection'

export interface TargetPickerEffect {
  /** spell_effects.id */
  id: string
  /** Display name */
  name: string
  /** rules_json — used for buff/debuff classification. */
  rulesJson: string
}

export interface TargetPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The spell being cast — shown in the dialog header. */
  spellName: string
  /** The linked effect that will be applied to the selected targets. */
  effect: TargetPickerEffect
  /** Caster's combatant id — used for allegiance grouping. */
  casterId: string
  /** Max targets — 1 = radio mode, >1 = checkbox mode capped at N. */
  maxTargets: number
  /** Invoked with selected combatant ids when the user confirms. */
  onApply: (targetIds: string[]) => void
}

export function TargetPickerDialog({
  open,
  onOpenChange,
  spellName,
  effect,
  casterId,
  maxTargets,
  onApply,
}: TargetPickerDialogProps) {
  const { combatants } = useCombatantStore(
    useShallow((s) => ({ combatants: s.combatants })),
  )

  const buckets = useMemo(
    () => splitByAllegiance(combatants, casterId),
    [combatants, casterId],
  )

  const kind: EffectKind = useMemo(
    () => classifyEffectKind(effect.rulesJson),
    [effect.rulesJson],
  )

  // Default-selection preset . Runs whenever the dialog opens with a
  // fresh effect/caster pair. Users can deselect/multi-select freely afterwards.
  const defaultIds = useMemo(() => {
    if (kind === 'buff') {
      const allyIds = buckets.allies.map((a) => a.id)
      // "not caster unless only member" — if allies empty + only self in faction,
      // fall back to caster.
      if (allyIds.length > 0) return allyIds.slice(0, maxTargets)
      return buckets.caster ? [buckets.caster.id] : []
    }
    if (kind === 'debuff') {
      return buckets.enemies.map((e) => e.id).slice(0, maxTargets)
    }
    return buckets.caster ? [buckets.caster.id] : []
  }, [kind, buckets, maxTargets])

  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open) setSelected(new Set(defaultIds))
  }, [open, defaultIds])

  const isMulti = maxTargets > 1
  const count = selected.size
  const tooMany = count > maxTargets
  const canApply = count > 0 && !tooMany

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (!isMulti) {
          // Radio mode — replace.
          next.clear()
          next.add(id)
          return next
        }
        next.add(id)
      }
      return next
    })
  }

  function handleApply() {
    if (!canApply) return
    onApply(Array.from(selected))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg p-0 gap-0"
        aria-label={`Select targets for ${spellName}`}
      >
        <DialogHeader className="px-4 pt-4 pb-2 border-b border-border/40">
          <DialogTitle className="text-sm">
            Cast <span className="text-primary">{spellName}</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {isMulti
              ? `Choose up to ${maxTargets} targets`
              : 'Choose target'}
            {buckets.caster && (
              <>
                {' — '}
                <span className="text-foreground">{buckets.caster.displayName}</span>
              </>
            )}
          </p>
        </DialogHeader>

        <div className="px-4 py-3 space-y-3 max-h-[24rem] overflow-y-auto">
          {buckets.caster && (
            <AllegianceGroup
              label="Caster"
              combatants={[buckets.caster]}
              selected={selected}
              onToggle={toggle}
              isMulti={isMulti}
              defaultOpen={kind === 'self'}
              accentClass="border-l-2 border-accent/40"
              regionLabel="caster"
            />
          )}
          <AllegianceGroup
            label={`Allies (${buckets.allies.length})`}
            combatants={buckets.allies}
            selected={selected}
            onToggle={toggle}
            isMulti={isMulti}
            defaultOpen={kind === 'buff'}
            accentClass="border-l-2 border-primary/40"
            regionLabel="allies"
          />
          <AllegianceGroup
            label={`Enemies (${buckets.enemies.length})`}
            combatants={buckets.enemies}
            selected={selected}
            onToggle={toggle}
            isMulti={isMulti}
            defaultOpen={kind === 'debuff'}
            accentClass="border-l-2 border-destructive/40"
            regionLabel="enemies"
          />
        </div>

        <footer className="flex items-center justify-between px-4 py-3 border-t border-border/40">
          <span
            className={cn(
              'text-xs',
              tooMany ? 'text-destructive font-semibold' : 'text-muted-foreground',
            )}
          >
            {isMulti
              ? `${count} of ${maxTargets} selected`
              : `${count} selected`}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              disabled={!canApply}
              aria-disabled={!canApply}
              className={cn(tooMany && 'border border-destructive')}
            >
              Apply to {count} target{count === 1 ? '' : 's'}
            </Button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  )
}

// ── Group ────────────────────────────────────────────────────────────────────

interface AllegianceGroupProps {
  label: string
  combatants: Combatant[]
  selected: Set<string>
  onToggle: (id: string) => void
  isMulti: boolean
  defaultOpen: boolean
  accentClass: string
  regionLabel: string
}

function AllegianceGroup({
  label,
  combatants,
  selected,
  onToggle,
  isMulti,
  defaultOpen,
  accentClass,
  regionLabel,
}: AllegianceGroupProps) {
  if (combatants.length === 0) return null

  const content = (
    <div className={cn('pl-3 space-y-1', accentClass)}>
      {isMulti
        ? combatants.map((c) => (
            <TargetRow
              key={c.id}
              combatant={c}
              selected={selected.has(c.id)}
              onToggle={onToggle}
              mode="check"
            />
          ))
        : (
          <RadioGroup
            value={combatants.find((c) => selected.has(c.id))?.id ?? ''}
            onValueChange={(v) => onToggle(v)}
            className="gap-1"
          >
            {combatants.map((c) => (
              <TargetRow
                key={c.id}
                combatant={c}
                selected={selected.has(c.id)}
                onToggle={onToggle}
                mode="radio"
              />
            ))}
          </RadioGroup>
        )}
    </div>
  )

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <section role="region" aria-label={regionLabel}>
        <CollapsibleTrigger className="group flex w-full items-center gap-2 text-left py-1 hover:text-primary transition-colors">
          <ChevronDown className="w-3 h-3 transition-transform duration-200 group-data-[state=closed]:-rotate-90 text-muted-foreground" />
          <span className="text-muted-foreground text-xs uppercase tracking-wide">
            {label}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>{content}</CollapsibleContent>
      </section>
    </Collapsible>
  )
}

// ── Row ──────────────────────────────────────────────────────────────────────

interface TargetRowProps {
  combatant: Combatant
  selected: boolean
  onToggle: (id: string) => void
  mode: 'check' | 'radio'
}

function TargetRow({ combatant, selected, onToggle, mode }: TargetRowProps) {
  const level = combatant.level ?? 0
  const hpPct = combatant.maxHp > 0
    ? Math.round((combatant.hp / combatant.maxHp) * 100)
    : 0
  const hpColor = hpPct <= 25
    ? 'text-pf-blood'
    : hpPct <= 50
      ? 'text-amber-400'
      : 'text-foreground'

  return (
    <label
      className={cn(
        'flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors',
        'hover:bg-accent/10',
        selected && 'bg-accent/20',
      )}
      onClick={(e) => {
        // Prevent double-toggle when clicking the input itself.
        if ((e.target as HTMLElement).closest('[data-slot="checkbox"]')) return
        if ((e.target as HTMLElement).closest('[data-slot="radio-group-item"]')) return
        e.preventDefault()
        onToggle(combatant.id)
      }}
    >
      {mode === 'check' ? (
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggle(combatant.id)}
          aria-label={`Select ${combatant.displayName}`}
        />
      ) : (
        <RadioGroupItem value={combatant.id} aria-label={`Select ${combatant.displayName}`} />
      )}
      <LevelBadge level={level} size="sm" />
      <span className="flex-1 text-sm">{combatant.displayName}</span>
      <span className={cn('font-mono text-xs', hpColor)}>
        {combatant.hp}/{combatant.maxHp}
      </span>
    </label>
  )
}
