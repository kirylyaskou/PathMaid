import { useState } from 'react'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { Button } from '@/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { X, Plus } from 'lucide-react'
import type { BuilderTabsProps } from '../BuilderTabs'
import type {
  DisplayActionCost,
  CreatureStatBlockData,
} from '@/entities/creature/model/types'

type Ability = CreatureStatBlockData['abilities'][number]

const ACTION_COST_OPTIONS: { value: string; label: string }[] = [
  { value: '__none', label: '—' },
  { value: '0', label: 'Free (◇)' },
  { value: '1', label: '1 (◆)' },
  { value: '2', label: '2 (◆◆)' },
  { value: '3', label: '3 (◆◆◆)' },
  { value: 'reaction', label: 'Reaction (↩)' },
  { value: 'free', label: 'Free action (●)' },
]

function parseCost(v: string): DisplayActionCost | undefined {
  if (v === '__none') return undefined
  if (v === '0' || v === '1' || v === '2' || v === '3') return Number(v) as DisplayActionCost
  return v as DisplayActionCost
}

function costToString(c: DisplayActionCost | undefined): string {
  if (c === undefined) return '__none'
  return String(c)
}

function newAbility(): Ability {
  return { name: 'New Ability', description: '', traits: [] }
}

export function AbilitiesTab({ state, dispatch }: BuilderTabsProps) {
  const { form } = state
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-base font-semibold">Abilities</h2>
      {form.abilities.length === 0 && (
        <div className="flex items-center justify-between p-4 rounded-md border border-dashed border-border/50 bg-secondary/20">
          <p className="text-sm text-muted-foreground">No special abilities.</p>
          <Button
            size="sm"
            onClick={() => dispatch({ type: 'ADD_ABILITY', ability: newAbility() })}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Ability
          </Button>
        </div>
      )}
      {form.abilities.map((ability, i) => (
        <AbilityEditor
          key={i}
          ability={ability}
          onChange={(a) => dispatch({ type: 'UPDATE_ABILITY', index: i, ability: a })}
          onRemove={() => dispatch({ type: 'REMOVE_ABILITY', index: i })}
        />
      ))}
      {form.abilities.length > 0 && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => dispatch({ type: 'ADD_ABILITY', ability: newAbility() })}
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Ability
        </Button>
      )}
    </div>
  )
}

interface AbilityEditorProps {
  ability: Ability
  onChange: (a: Ability) => void
  onRemove: () => void
}

function AbilityEditor({ ability, onChange, onRemove }: AbilityEditorProps) {
  const [traitInput, setTraitInput] = useState('')
  const traits = ability.traits ?? []

  function addTrait() {
    const t = traitInput.trim()
    if (!t || traits.includes(t)) return
    onChange({ ...ability, traits: [...traits, t] })
    setTraitInput('')
  }

  return (
    <div className="space-y-3 p-3 rounded-md border border-border/50 bg-card">
      <div className="flex items-center gap-2">
        <Input
          value={ability.name}
          onChange={(e) => onChange({ ...ability, name: e.target.value })}
          placeholder="Ability name"
          className="flex-1"
        />
        <Select
          value={costToString(ability.actionCost)}
          onValueChange={(v) => onChange({ ...ability, actionCost: parseCost(v) })}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTION_COST_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          type="button"
          aria-label="Remove ability"
          onClick={onRemove}
          className="p-1 text-muted-foreground hover:text-destructive"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          rows={3}
          value={ability.description}
          onChange={(e) => onChange({ ...ability, description: e.target.value })}
        />
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
        {traits.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {traits.map((t, ti) => (
              <span
                key={`${t}-${ti}`}
                className="inline-flex items-center gap-1 text-xs rounded bg-secondary/50 border border-border/50 px-2 py-0.5"
              >
                {t}
                <button
                  type="button"
                  aria-label={`Remove ${t}`}
                  onClick={() =>
                    onChange({ ...ability, traits: traits.filter((_, i) => i !== ti) })
                  }
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
