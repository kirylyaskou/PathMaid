import { useState } from 'react'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Button } from '@/shared/ui/button'
import { X, Plus } from 'lucide-react'
import type { BuilderTabsProps } from '../BuilderTabs'
import { normalizeImmunities } from '@/entities/creature/model/iwr-normalize'
import type {
  ImmunityEntry,
  WeaknessEntry,
  ResistanceEntry,
} from '@/entities/creature/model/types'

export function IwrTab({ state, dispatch }: BuilderTabsProps) {
  const { form } = state
  const immunitiesNormalized = normalizeImmunities(form.immunities)

  const allEmpty =
    form.immunities.length === 0 &&
    form.weaknesses.length === 0 &&
    form.resistances.length === 0

  return (
    <div className="p-4 space-y-5">
      <h2 className="text-base font-semibold">IWR</h2>

      {allEmpty && (
        <div className="p-4 rounded-md border border-dashed border-border/50 bg-secondary/20 space-y-2">
          <p className="text-sm text-muted-foreground">
            No immunities, weaknesses, or resistances.
          </p>
        </div>
      )}

      {/* Immunities */}
      <ImmunitySection
        entries={immunitiesNormalized}
        onAdd={(entry) => dispatch({ type: 'ADD_IMMUNITY', entry })}
        onRemove={(i) => dispatch({ type: 'REMOVE_IMMUNITY', index: i })}
      />

      {/* Weaknesses */}
      <WeaknessResistanceSection
        kind="Weakness"
        entries={form.weaknesses}
        onAdd={(entry) => dispatch({ type: 'ADD_WEAKNESS', entry })}
        onUpdate={(i, entry) => dispatch({ type: 'UPDATE_WEAKNESS', index: i, entry })}
        onRemove={(i) => dispatch({ type: 'REMOVE_WEAKNESS', index: i })}
      />

      {/* Resistances */}
      <WeaknessResistanceSection
        kind="Resistance"
        entries={form.resistances as (WeaknessEntry | ResistanceEntry)[]}
        onAdd={(entry) => dispatch({ type: 'ADD_RESISTANCE', entry })}
        onUpdate={(i, entry) => dispatch({ type: 'UPDATE_RESISTANCE', index: i, entry })}
        onRemove={(i) => dispatch({ type: 'REMOVE_RESISTANCE', index: i })}
      />
    </div>
  )
}

// --- Immunity section --------------------------------------------------

interface ImmunitySectionProps {
  entries: { type: string; exceptions?: string[] }[]
  onAdd: (entry: ImmunityEntry) => void
  onRemove: (idx: number) => void
}

function ImmunitySection({ entries, onAdd, onRemove }: ImmunitySectionProps) {
  const [typeInput, setTypeInput] = useState('')
  const [exceptionsInput, setExceptionsInput] = useState('')

  function add() {
    const type = typeInput.trim()
    if (!type) return
    const exceptions = exceptionsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const entry: ImmunityEntry = exceptions.length > 0 ? { type, exceptions } : type
    onAdd(entry)
    setTypeInput('')
    setExceptionsInput('')
  }

  return (
    <div className="space-y-2">
      <Label>Immunities</Label>
      <div className="flex items-center gap-2">
        <Input
          value={typeInput}
          onChange={(e) => setTypeInput(e.target.value)}
          placeholder="Type (e.g. fire, poison)"
          className="flex-1"
        />
        <Input
          value={exceptionsInput}
          onChange={(e) => setExceptionsInput(e.target.value)}
          placeholder="Exceptions (comma-separated, optional)"
          className="flex-1"
        />
        <Button size="sm" variant="outline" onClick={add}>
          <Plus className="w-3 h-3 mr-1" />
          Add Immunity
        </Button>
      </div>
      {entries.length > 0 && (
        <div className="space-y-1 pt-1">
          {entries.map((e, i) => (
            <div
              key={`${e.type}-${i}`}
              className="flex items-center gap-2 bg-secondary/30 rounded-md px-2 py-1.5"
            >
              <span className="flex-1 text-sm">
                <span className="font-medium">{e.type}</span>
                {e.exceptions && e.exceptions.length > 0 && (
                  <span className="text-muted-foreground">
                    {' '}
                    (except {e.exceptions.join(', ')})
                  </span>
                )}
              </span>
              <button
                type="button"
                aria-label={`Remove ${e.type}`}
                onClick={() => onRemove(i)}
                className="p-1 text-muted-foreground hover:text-destructive"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Weakness / Resistance section ------------------------------------

interface WRProps {
  kind: 'Weakness' | 'Resistance'
  entries: (WeaknessEntry | ResistanceEntry)[]
  onAdd: (entry: WeaknessEntry) => void
  onUpdate: (idx: number, entry: WeaknessEntry) => void
  onRemove: (idx: number) => void
}

function WeaknessResistanceSection({
  kind,
  entries,
  onAdd,
  onUpdate,
  onRemove,
}: WRProps) {
  const [typeInput, setTypeInput] = useState('')
  const [valueInput, setValueInput] = useState(5)
  const [exceptionsInput, setExceptionsInput] = useState('')

  function add() {
    const type = typeInput.trim()
    if (!type) return
    const exceptions = exceptionsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const entry: WeaknessEntry =
      exceptions.length > 0
        ? { type, value: valueInput, exceptions }
        : { type, value: valueInput }
    onAdd(entry)
    setTypeInput('')
    setValueInput(5)
    setExceptionsInput('')
  }

  return (
    <div className="space-y-2">
      <Label>{kind === 'Weakness' ? 'Weaknesses' : 'Resistances'}</Label>
      <div className="flex items-center gap-2">
        <Input
          value={typeInput}
          onChange={(e) => setTypeInput(e.target.value)}
          placeholder="Type"
          className="flex-1"
        />
        <Input
          type="number"
          className="font-mono w-20"
          value={valueInput}
          onChange={(e) => setValueInput(Number(e.target.value))}
        />
        <Input
          value={exceptionsInput}
          onChange={(e) => setExceptionsInput(e.target.value)}
          placeholder="Exceptions (comma-separated)"
          className="flex-1"
        />
        <Button size="sm" variant="outline" onClick={add}>
          <Plus className="w-3 h-3 mr-1" />
          Add {kind}
        </Button>
      </div>
      {entries.length > 0 && (
        <div className="space-y-1 pt-1">
          {entries.map((e, i) => (
            <div
              key={`${e.type}-${i}`}
              className="flex items-center gap-2 bg-secondary/30 rounded-md px-2 py-1.5"
            >
              <Input
                value={e.type}
                onChange={(v) => onUpdate(i, { ...e, type: v.target.value })}
                className="flex-1"
              />
              <Input
                type="number"
                className="font-mono w-20"
                value={e.value}
                onChange={(v) => onUpdate(i, { ...e, value: Number(v.target.value) })}
              />
              <Input
                value={(e.exceptions ?? []).join(', ')}
                onChange={(v) => {
                  const exceptions = v.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                  onUpdate(i, {
                    ...e,
                    exceptions: exceptions.length > 0 ? exceptions : undefined,
                  })
                }}
                placeholder="Exceptions"
                className="flex-1"
              />
              <button
                type="button"
                aria-label={`Remove ${e.type}`}
                onClick={() => onRemove(i)}
                className="p-1 text-muted-foreground hover:text-destructive"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
