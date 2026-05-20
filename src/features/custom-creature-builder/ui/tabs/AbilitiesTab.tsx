import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { Button } from '@/shared/ui/button'
import { SearchInput } from '@/shared/ui/search-input'
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
import { searchActions, searchFeats } from '@/shared/api'
import {
  actionToAbilityTemplate,
  featToAbilityTemplate,
  type AbilityTemplate,
} from '../../lib/ability-template'

type Ability = CreatureStatBlockData['abilities'][number]
const TEMPLATE_RESULT_LIMIT = 6

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
  const addAbility = useCallback(
    (ability: Ability) => dispatch({ type: 'ADD_ABILITY', ability }),
    [dispatch],
  )

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-base font-semibold">{t('customCreatureBuilder.abilitiesTab.heading')}</h2>
      <AbilityTemplatePicker onPick={addAbility} />
      {form.abilities.length === 0 && (
        <div className="flex items-center justify-between p-4 rounded-md border border-dashed border-border/50 bg-secondary/20">
          <p className="text-sm text-muted-foreground">{t('customCreatureBuilder.abilitiesTab.noSpecialAbilities')}</p>
          <Button
            size="sm"
            onClick={() => addAbility(newAbility())}
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
          onClick={() => addAbility(newAbility())}
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          {t('customCreatureBuilder.abilitiesTab.addAbility')}
        </Button>
      )}
    </div>
  )
}

interface AbilityTemplatePickerProps {
  onPick: (ability: Ability) => void
}

function AbilityTemplatePicker({ onPick }: AbilityTemplatePickerProps) {
  const { t } = useTranslation('common')
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [results, setResults] = useState<AbilityTemplate[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 200)
    return () => clearTimeout(id)
  }, [query])

  useEffect(() => {
    const searchTerm = debounced.trim()
    if (searchTerm.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setResults([])
    void (async () => {
      try {
        const [actions, feats] = await Promise.all([
          searchActions(searchTerm, TEMPLATE_RESULT_LIMIT),
          searchFeats(searchTerm, TEMPLATE_RESULT_LIMIT),
        ])
        if (cancelled) return
        setResults([
          ...actions.map(actionToAbilityTemplate),
          ...feats.map(featToAbilityTemplate),
        ])
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [debounced])

  const emptyMessage = useMemo(() => {
    if (loading) return t('customCreatureBuilder.abilitiesTab.searchingTemplates')
    if (debounced.trim().length < 2) return t('customCreatureBuilder.abilitiesTab.startTemplateSearch')
    if (results.length === 0) return t('customCreatureBuilder.abilitiesTab.noTemplatesFound')
    return null
  }, [debounced, loading, results.length, t])

  return (
    <div className="space-y-2 rounded-md border border-border/50 bg-secondary/20 p-3">
      <Label>{t('customCreatureBuilder.abilitiesTab.templateSearchLabel')}</Label>
      <SearchInput
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('customCreatureBuilder.abilitiesTab.templateSearchPlaceholder')}
        className="h-8 text-sm bg-background/60"
        loading={loading}
      />
      {emptyMessage && (
        <p className="text-xs text-muted-foreground py-1">{emptyMessage}</p>
      )}
      {results.length > 0 && (
        <div className="grid gap-1">
          {results.map((template) => (
            <AbilityTemplateResult
              key={`${template.kind}-${template.id}`}
              template={template}
              onPick={onPick}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface AbilityTemplateResultProps {
  template: AbilityTemplate
  onPick: (ability: Ability) => void
}

function AbilityTemplateResult({ template, onPick }: AbilityTemplateResultProps) {
  const { t } = useTranslation('common')
  const kindLabel = t(`customCreatureBuilder.abilitiesTab.templateKinds.${template.kind}`)
  const levelLabel = template.level == null
    ? null
    : t('customCreatureBuilder.abilitiesTab.templateLevel', { level: template.level })

  return (
    <button
      type="button"
      className="flex items-center gap-2 rounded-md border border-border/40 bg-background/45 px-2 py-1.5 text-left hover:border-primary/50 hover:bg-secondary/50"
      aria-label={t('customCreatureBuilder.abilitiesTab.addTemplateAriaLabel', { name: template.name })}
      onClick={() => onPick(template.ability)}
    >
      <Plus className="w-3.5 h-3.5 text-primary shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{template.name}</span>
        <span className="block truncate text-[11px] text-muted-foreground">
          {[kindLabel, levelLabel, template.sourceLabel].filter(Boolean).join(' · ')}
        </span>
      </span>
    </button>
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
