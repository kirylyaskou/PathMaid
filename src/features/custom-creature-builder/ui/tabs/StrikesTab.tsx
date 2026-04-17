import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Button } from '@/shared/ui/button'
import { X, Plus } from 'lucide-react'
import { getBenchmark } from '@engine'
import type { Tier } from '@engine'
import type { CreatureStatBlockData } from '@/entities/creature/model/types'
import type { BuilderTabsProps } from '../BuilderTabs'
import { BenchmarkHint } from '../BenchmarkHint'
import { TIER_COLORS, TIER_LABEL, TIER_ORDER } from '../../lib/tier-colors'

type Strike = CreatureStatBlockData['strikes'][number]

const EMPTY_STRIKE: Strike = {
  name: 'Claw',
  modifier: 0,
  damage: [{ formula: '1d4', type: 'slashing' }],
  traits: [],
}

export function StrikesTab({ state, dispatch }: BuilderTabsProps) {
  const { form } = state
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-base font-semibold">Strikes</h2>
      {form.strikes.length === 0 && (
        <div className="flex items-center justify-between p-4 rounded-md border border-dashed border-border/50 bg-secondary/20">
          <p className="text-sm text-muted-foreground">No strikes defined.</p>
          <Button
            size="sm"
            onClick={() => dispatch({ type: 'ADD_STRIKE', strike: { ...EMPTY_STRIKE } })}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Strike
          </Button>
        </div>
      )}
      {form.strikes.map((strike, i) => (
        <StrikeEditor
          key={i}
          strike={strike}
          index={i}
          level={form.level}
          onChange={(s) => dispatch({ type: 'UPDATE_STRIKE', index: i, strike: s })}
          onRemove={() => dispatch({ type: 'REMOVE_STRIKE', index: i })}
        />
      ))}
      {form.strikes.length > 0 && (
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            dispatch({
              type: 'ADD_STRIKE',
              strike: { ...EMPTY_STRIKE, name: `Strike ${form.strikes.length + 1}` },
            })
          }
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Strike
        </Button>
      )}
    </div>
  )
}

interface StrikeEditorProps {
  strike: Strike
  index: number
  level: number
  onChange: (s: Strike) => void
  onRemove: () => void
}

function StrikeEditor({ strike, level, onChange, onRemove }: StrikeEditorProps) {
  const [traitInput, setTraitInput] = useState('')

  function addTrait() {
    const t = traitInput.trim()
    if (!t || strike.traits.includes(t)) return
    onChange({ ...strike, traits: [...strike.traits, t] })
    setTraitInput('')
  }
  function removeTrait(idx: number) {
    onChange({ ...strike, traits: strike.traits.filter((_, i) => i !== idx) })
  }
  function updateDamage(rowIdx: number, patch: Partial<Strike['damage'][number]>) {
    onChange({
      ...strike,
      damage: strike.damage.map((d, i) => (i === rowIdx ? { ...d, ...patch } : d)),
    })
  }
  function addDamageRow() {
    onChange({ ...strike, damage: [...strike.damage, { formula: '1d4', type: 'slashing' }] })
  }
  function removeDamageRow(rowIdx: number) {
    onChange({ ...strike, damage: strike.damage.filter((_, i) => i !== rowIdx) })
  }
  function setDamageToTier(tier: Tier) {
    const bench = getBenchmark('strikeDamage', level, tier)
    // Replace first damage row's formula with tier formula; keep its type.
    onChange({
      ...strike,
      damage:
        strike.damage.length > 0
          ? [{ ...strike.damage[0], formula: bench.formula }, ...strike.damage.slice(1)]
          : [{ formula: bench.formula, type: 'slashing' }],
    })
  }

  return (
    <div className="space-y-3 p-3 rounded-md border border-border/50 bg-card">
      <div className="flex items-center justify-between gap-2">
        <Input
          value={strike.name}
          onChange={(e) => onChange({ ...strike, name: e.target.value })}
          placeholder="Strike name (e.g. Claw)"
          className="flex-1"
        />
        <button
          type="button"
          aria-label="Remove strike"
          onClick={onRemove}
          className="p-1 text-muted-foreground hover:text-destructive"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Attack modifier</Label>
            <BenchmarkHint
              stat="attackBonus"
              level={level}
              value={strike.modifier}
              onSelectTier={(v) => onChange({ ...strike, modifier: v })}
            />
          </div>
          <Input
            type="number"
            className="font-mono"
            value={strike.modifier}
            onChange={(e) => onChange({ ...strike, modifier: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Damage (first row)</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] uppercase tracking-wider font-semibold text-muted-foreground border-border/60 bg-secondary/30 hover:bg-secondary/50"
                  title="Set damage formula to benchmark tier"
                >
                  Set to tier…
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[200px]">
                {TIER_ORDER.map((t) => {
                  const bench = getBenchmark('strikeDamage', level, t)
                  const colors = TIER_COLORS[t]
                  return (
                    <DropdownMenuItem
                      key={t}
                      onClick={() => setDamageToTier(t)}
                      className="flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <span
                        className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded border text-[10px] uppercase tracking-wider font-semibold ${colors.text} ${colors.bg} ${colors.border}`}
                      >
                        {TIER_LABEL[t]}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {bench.formula} ({bench.expected})
                      </span>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="space-y-2">
            {strike.damage.map((dmg, di) => (
              <div key={di} className="flex items-center gap-2">
                <Input
                  value={dmg.formula}
                  onChange={(e) => updateDamage(di, { formula: e.target.value })}
                  placeholder="1d6+2"
                  className="font-mono flex-1"
                />
                <Input
                  value={dmg.type}
                  onChange={(e) => updateDamage(di, { type: e.target.value })}
                  placeholder="slashing"
                  className="w-28"
                />
                <button
                  type="button"
                  aria-label="Remove damage row"
                  onClick={() => removeDamageRow(di)}
                  className="p-1 text-muted-foreground hover:text-destructive"
                  disabled={strike.damage.length <= 1}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={addDamageRow}>
              <Plus className="w-3 h-3 mr-1" />
              Add damage row
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Traits</Label>
        <div className="flex items-center gap-2">
          <Input
            value={traitInput}
            onChange={(e) => setTraitInput(e.target.value)}
            placeholder="Add trait…"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTrait()
              }
            }}
          />
          <Button size="sm" variant="outline" onClick={addTrait}>
            Add
          </Button>
        </div>
        {strike.traits.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {strike.traits.map((t, ti) => (
              <span
                key={`${t}-${ti}`}
                className="inline-flex items-center gap-1 text-xs rounded bg-secondary/50 border border-border/50 px-2 py-0.5"
              >
                {t}
                <button
                  type="button"
                  aria-label={`Remove ${t}`}
                  onClick={() => removeTrait(ti)}
                  className="hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
