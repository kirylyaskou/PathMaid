import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Button } from '@/shared/ui/button'
import { X, Plus } from 'lucide-react'
import type { BuilderTabsProps } from '../BuilderTabs'
import { normalizeImmunities } from '@/entities/creature'
import type {
  ImmunityEntry,
  WeaknessEntry,
  ResistanceEntry,
} from '@/entities/creature'

export function IwrTab({ state, dispatch }: BuilderTabsProps) {
  const { t } = useTranslation('common')
  const { form } = state
  const immunitiesNormalized = normalizeImmunities(form.immunities)

  const allEmpty =
    form.immunities.length === 0 &&
    form.weaknesses.length === 0 &&
    form.resistances.length === 0

  return (
    <div className="p-4 space-y-5">
      <h2 className="text-base font-semibold">{t('customCreatureBuilder.iwrTab.heading')}</h2>

      {allEmpty && (
        <div className="p-4 rounded-md border border-dashed border-border/50 bg-secondary/20 space-y-2">
          <p className="text-sm text-muted-foreground">
            {t('customCreatureBuilder.iwrTab.noIwrAdded')}
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
  const { t } = useTranslation('common')
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
      <Label>{t('customCreatureBuilder.iwrTab.immunities')}</Label>
      <div className="flex items-center gap-2">
        <Input
          value={typeInput}
          onChange={(e) => setTypeInput(e.target.value)}
          placeholder={t('customCreatureBuilder.iwrTab.immunityTypePlaceholder')}
          className="flex-1"
        />
        <Input
          value={exceptionsInput}
          onChange={(e) => setExceptionsInput(e.target.value)}
          placeholder={t('customCreatureBuilder.iwrTab.exceptionPlaceholder')}
          className="flex-1"
        />
        <Button size="sm" variant="outline" onClick={add}>
          <Plus className="w-3 h-3 mr-1" />
          {t('customCreatureBuilder.iwrTab.addImmunity')}
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
                    ({t('customCreatureBuilder.iwrTab.exceptLabel')} {e.exceptions.join(', ')})
                  </span>
                )}
              </span>
              <button
                type="button"
                aria-label={t('customCreatureBuilder.iwrTab.removeAriaLabel', { type: e.type })}
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
  const { t } = useTranslation('common')
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
      <Label>
        {t(
          kind === 'Weakness'
            ? 'customCreatureBuilder.iwrTab.weaknesses'
            : 'customCreatureBuilder.iwrTab.resistances',
        )}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          value={typeInput}
          onChange={(e) => setTypeInput(e.target.value)}
          placeholder={t(
            kind === 'Weakness'
              ? 'customCreatureBuilder.iwrTab.weaknessTypePlaceholder'
              : 'customCreatureBuilder.iwrTab.resistanceTypePlaceholder',
          )}
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
          placeholder={t('customCreatureBuilder.iwrTab.exceptionPlaceholder')}
          className="flex-1"
        />
        <Button size="sm" variant="outline" onClick={add}>
          <Plus className="w-3 h-3 mr-1" />
          {t(
            kind === 'Weakness'
              ? 'customCreatureBuilder.iwrTab.addWeakness'
              : 'customCreatureBuilder.iwrTab.addResistance',
          )}
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
                placeholder={t('customCreatureBuilder.iwrTab.exceptionPlaceholder')}
                className="flex-1"
              />
              <button
                type="button"
                aria-label={t('customCreatureBuilder.iwrTab.removeAriaLabel', { type: e.type })}
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
