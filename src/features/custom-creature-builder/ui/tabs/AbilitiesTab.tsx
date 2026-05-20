import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
} from '@/entities/creature'
import { sanitizeFoundryText } from '@/shared/lib/foundry-tokens'

type Ability = CreatureStatBlockData['abilities'][number]

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

function normalizeEditableDescription(description: string): string {
  return /<[^>]+>|@UUID\[/.test(description) ? sanitizeFoundryText(description) : description
}

export function AbilitiesTab({ state, dispatch }: BuilderTabsProps) {
  const { t } = useTranslation('common')
  const { form } = state
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-base font-semibold">{t('customCreatureBuilder.abilitiesTab.heading')}</h2>
      {form.abilities.length === 0 && (
        <div className="flex items-center justify-between p-4 rounded-md border border-dashed border-border/50 bg-secondary/20">
          <p className="text-sm text-muted-foreground">{t('customCreatureBuilder.abilitiesTab.noSpecialAbilities')}</p>
          <Button
            size="sm"
            onClick={() => dispatch({ type: 'ADD_ABILITY', ability: newAbility() })}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            {t('customCreatureBuilder.abilitiesTab.addAbility')}
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
          {t('customCreatureBuilder.abilitiesTab.addAbility')}
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
  const { t } = useTranslation('common')
  const [traitInput, setTraitInput] = useState('')
  const traits = ability.traits ?? []
  const editableDescription = useMemo(
    () => normalizeEditableDescription(ability.description),
    [ability.description],
  )

  const actionCostOptions = useMemo(
    () => [
      { value: '__none', label: t('customCreatureBuilder.abilitiesTab.actionCostOptions.none') },
      { value: '0', label: t('customCreatureBuilder.abilitiesTab.actionCostOptions.free') },
      { value: '1', label: t('customCreatureBuilder.abilitiesTab.actionCostOptions.one') },
      { value: '2', label: t('customCreatureBuilder.abilitiesTab.actionCostOptions.two') },
      { value: '3', label: t('customCreatureBuilder.abilitiesTab.actionCostOptions.three') },
      { value: 'reaction', label: t('customCreatureBuilder.abilitiesTab.actionCostOptions.reaction') },
      { value: 'free', label: t('customCreatureBuilder.abilitiesTab.actionCostOptions.freeAction') },
    ],
    [t],
  )

  function addTrait() {
    const traitVal = traitInput.trim()
    if (!traitVal || traits.includes(traitVal)) return
    onChange({ ...ability, traits: [...traits, traitVal] })
    setTraitInput('')
  }

  return (
    <div className="space-y-3 p-3 rounded-md border border-border/50 bg-card">
      <div className="flex items-center gap-2">
        <Input
          value={ability.name}
          onChange={(e) => onChange({ ...ability, name: e.target.value })}
          placeholder={t('customCreatureBuilder.abilitiesTab.abilityNamePlaceholder')}
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
            {actionCostOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          type="button"
          aria-label={t('customCreatureBuilder.abilitiesTab.removeAbilityAriaLabel')}
          onClick={onRemove}
          className="p-1 text-muted-foreground hover:text-destructive"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        <Label>{t('customCreatureBuilder.abilitiesTab.description')}</Label>
        <Textarea
          rows={3}
          value={editableDescription}
          onChange={(e) => onChange({ ...ability, description: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>{t('customCreatureBuilder.abilitiesTab.traits')}</Label>
        <div className="flex items-center gap-2">
          <Input
            value={traitInput}
            onChange={(e) => setTraitInput(e.target.value)}
            placeholder={t('customCreatureBuilder.abilitiesTab.addTraitPlaceholder')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTrait()
              }
            }}
          />
          <Button size="sm" variant="outline" onClick={addTrait}>
            {t('customCreatureBuilder.abilitiesTab.addTraitButton')}
          </Button>
        </div>
        {traits.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {traits.map((trait, ti) => (
              <span
                key={`${trait}-${ti}`}
                className="inline-flex items-center gap-1 text-xs rounded bg-secondary/50 border border-border/50 px-2 py-0.5"
              >
                {trait}
                <button
                  type="button"
                  aria-label={t('customCreatureBuilder.abilitiesTab.removeTraitAriaLabel', { name: trait })}
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
