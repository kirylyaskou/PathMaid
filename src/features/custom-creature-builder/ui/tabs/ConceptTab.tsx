import { useState } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Button } from '@/shared/ui/button'
import type { Rarity } from '@engine'
import type { DisplaySize } from '@/shared/lib/size-map'
import type { BuilderTabsProps } from '../BuilderTabs'

const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'unique']
const SIZES: DisplaySize[] = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan']

export function ConceptTab({ state, dispatch }: BuilderTabsProps) {
  const { form } = state
  const [traitInput, setTraitInput] = useState('')

  function addTrait() {
    const t = traitInput.trim()
    if (!t || form.traits.includes(t)) return
    dispatch({ type: 'SET_FIELD', path: 'traits', value: [...form.traits, t] })
    setTraitInput('')
  }

  function removeTrait(idx: number) {
    dispatch({
      type: 'SET_FIELD',
      path: 'traits',
      value: form.traits.filter((_, i) => i !== idx),
    })
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-base font-semibold">Concept</h2>

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) =>
            dispatch({ type: 'SET_FIELD', path: 'name', value: e.target.value })
          }
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="level">Level</Label>
          <Input
            id="level"
            type="number"
            min={-1}
            max={24}
            className="font-mono"
            value={form.level}
            onChange={(e) =>
              dispatch({ type: 'SET_FIELD', path: 'level', value: Number(e.target.value) })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Rarity</Label>
          <Select
            value={form.rarity}
            onValueChange={(v) =>
              dispatch({ type: 'SET_FIELD', path: 'rarity', value: v as Rarity })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RARITIES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Size</Label>
          <Select
            value={form.size}
            onValueChange={(v) =>
              dispatch({ type: 'SET_FIELD', path: 'size', value: v as DisplaySize })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIZES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Creature Type</Label>
        <Input
          id="type"
          value={form.type}
          placeholder="e.g. humanoid, beast, construct"
          onChange={(e) =>
            dispatch({ type: 'SET_FIELD', path: 'type', value: e.target.value })
          }
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
        {form.traits.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {form.traits.map((t, i) => (
              <span
                key={`${t}-${i}`}
                className="inline-flex items-center gap-1 text-xs rounded bg-secondary/50 border border-border/50 px-2 py-0.5"
              >
                {t}
                <button
                  type="button"
                  aria-label={`Remove ${t}`}
                  onClick={() => removeTrait(i)}
                  className="hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={4}
          value={form.description ?? ''}
          onChange={(e) =>
            dispatch({
              type: 'SET_FIELD',
              path: 'description',
              value: e.target.value || undefined,
            })
          }
        />
      </div>
    </div>
  )
}
