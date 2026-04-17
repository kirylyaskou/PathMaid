import { useState } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Button } from '@/shared/ui/button'
import type { BuilderTabsProps } from '../BuilderTabs'

const COMMON_SPEEDS = ['land', 'fly', 'swim', 'burrow', 'climb'] as const
type SpeedKey = typeof COMMON_SPEEDS[number]

export function SpeedsSensesTab({ state, dispatch }: BuilderTabsProps) {
  const { form } = state
  const [senseInput, setSenseInput] = useState('')
  const [langInput, setLangInput] = useState('')

  function setSpeed(key: SpeedKey, raw: string) {
    if (raw === '') {
      dispatch({ type: 'REMOVE_SPEED', key })
    } else {
      dispatch({ type: 'SET_SPEED', key, value: Number(raw) })
    }
  }

  function addSense() {
    const s = senseInput.trim()
    if (!s || form.senses.includes(s)) return
    dispatch({ type: 'SET_FIELD', path: 'senses', value: [...form.senses, s] })
    setSenseInput('')
  }
  function removeSense(idx: number) {
    dispatch({
      type: 'SET_FIELD',
      path: 'senses',
      value: form.senses.filter((_, i) => i !== idx),
    })
  }
  function addLanguage() {
    const l = langInput.trim()
    if (!l || form.languages.includes(l)) return
    dispatch({ type: 'SET_FIELD', path: 'languages', value: [...form.languages, l] })
    setLangInput('')
  }
  function removeLanguage(idx: number) {
    dispatch({
      type: 'SET_FIELD',
      path: 'languages',
      value: form.languages.filter((_, i) => i !== idx),
    })
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-base font-semibold">Speeds &amp; Senses</h2>

      <div className="space-y-2">
        <Label>Speeds (feet)</Label>
        <div className="grid grid-cols-2 gap-3">
          {COMMON_SPEEDS.map((key) => {
            const raw = form.speeds[key]
            const display = raw === null || raw === undefined ? '' : String(raw)
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="text-sm capitalize w-16">{key}</span>
                <Input
                  type="number"
                  className="font-mono"
                  value={display}
                  onChange={(e) => setSpeed(key, e.target.value)}
                />
              </div>
            )
          })}
        </div>
      </div>

      <ChipList
        label="Senses"
        input={senseInput}
        setInput={setSenseInput}
        items={form.senses}
        onAdd={addSense}
        onRemove={removeSense}
        placeholder="e.g. darkvision, scent (imprecise) 30 ft"
      />

      <ChipList
        label="Languages"
        input={langInput}
        setInput={setLangInput}
        items={form.languages}
        onAdd={addLanguage}
        onRemove={removeLanguage}
        placeholder="e.g. Common, Draconic"
      />
    </div>
  )
}

interface ChipListProps {
  label: string
  input: string
  setInput: (v: string) => void
  items: string[]
  onAdd: () => void
  onRemove: (idx: number) => void
  placeholder: string
}

function ChipList({ label, input, setInput, items, onAdd, onRemove, placeholder }: ChipListProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onAdd()
            }
          }}
        />
        <Button size="sm" variant="outline" onClick={onAdd}>
          Add
        </Button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2">
          {items.map((it, i) => (
            <span
              key={`${it}-${i}`}
              className="inline-flex items-center gap-1 text-xs rounded bg-secondary/50 border border-border/50 px-2 py-0.5"
            >
              {it}
              <button
                type="button"
                aria-label={`Remove ${it}`}
                onClick={() => onRemove(i)}
                className="hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
