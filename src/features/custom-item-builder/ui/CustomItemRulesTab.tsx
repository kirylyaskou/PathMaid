import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'
import { Label } from '@/shared/ui/label'
import { SearchInput } from '@/shared/ui/search-input'
import { searchActions, searchFeats, searchSpells } from '@/shared/api'
import type { ActionRow, CustomItemInput, FeatEntityRow, SpellSearchResult } from '@/shared/api'
import type { CustomItemActionCost, CustomItemAbilityKey } from '@engine'
import type { CustomItemRuleDraft } from '../model/types'
import { sanitizeFoundryText } from '@/shared/lib/foundry-tokens'
import { parseJsonArray } from '@/shared/lib/json'

interface CustomItemRulesTabProps {
  item: CustomItemInput
  onChange: (rulesJson: string) => void
}

type GrantSpellRuleDraft = Extract<CustomItemRuleDraft, { kind: 'grantSpell' }>
type GrantAbilityRuleDraft = Extract<CustomItemRuleDraft, { kind: 'grantAbility' }>

const TEMPLATE_RESULT_LIMIT = 6

function parseRules(json: string): CustomItemRuleDraft[] {
  try {
    const parsed = JSON.parse(json) as unknown
    return Array.isArray(parsed) ? parsed as CustomItemRuleDraft[] : []
  } catch {
    return []
  }
}

function serializeRules(rules: CustomItemRuleDraft[]): string {
  return JSON.stringify(rules, null, 2)
}

function toModifierType(value: string): 'item' | 'status' | 'circumstance' | 'untyped' {
  return value === 'item' || value === 'status' || value === 'circumstance' || value === 'untyped'
    ? value
    : 'untyped'
}

function toAbility(value: string): CustomItemAbilityKey {
  return value === 'str' || value === 'dex' || value === 'con' || value === 'int' || value === 'wis' || value === 'cha'
    ? value
    : 'dex'
}

function toActionCost(value: string): CustomItemActionCost | undefined {
  if (value === '') return undefined
  if (value === 'reaction' || value === 'free') return value
  const n = Number(value)
  return n === 0 || n === 1 || n === 2 || n === 3 ? n : undefined
}

function toCastType(value: string): 'innate' | 'prepared' | 'spontaneous' | 'focus' {
  return value === 'prepared' || value === 'spontaneous' || value === 'focus' ? value : 'innate'
}

function toFrequency(value: string): GrantSpellRuleDraft['frequency'] {
  const clean = value.trim().toLowerCase()
  if (!clean) return undefined
  if (clean === 'at-will' || clean === 'at will') return { kind: 'at-will' }
  const match = clean.match(/^(\d+)\s*\/\s*(day|hour|round)$/)
  if (!match) return undefined
  return { kind: 'per', max: Math.max(1, Number(match[1]) || 1), per: match[2] as 'day' | 'hour' | 'round' }
}

function frequencyText(frequency: GrantSpellRuleDraft['frequency']): string {
  if (!frequency) return ''
  if (frequency.kind === 'at-will') return 'at-will'
  return `${frequency.max}/${frequency.per}`
}

function parseTraits(value: string | null | undefined): string[] {
  return parseJsonArray<string>(value)
}

function parseFeatRaw(row: FeatEntityRow): Pick<GrantAbilityRuleDraft, 'description' | 'actionCost' | 'traits'> {
  try {
    const raw = JSON.parse(row.raw_json) as {
      system?: {
        description?: { value?: unknown }
        actionType?: { value?: unknown }
        actions?: { value?: unknown }
        traits?: { value?: unknown }
      }
    }
    const system = raw.system ?? {}
    const actionType = typeof system.actionType?.value === 'string' ? system.actionType.value : 'passive'
    const actionNum = typeof system.actions?.value === 'number' ? system.actions.value : null
    const traits = Array.isArray(system.traits?.value)
      ? system.traits.value.filter((v): v is string => typeof v === 'string')
      : parseTraits(row.traits)

    return {
      description: typeof system.description?.value === 'string'
        ? sanitizeFoundryText(system.description.value)
        : '',
      actionCost: toActionCost(actionType === 'reaction' || actionType === 'free' ? actionType : String(actionNum ?? '')),
      traits,
    }
  } catch {
    return { description: '', traits: parseTraits(row.traits) }
  }
}

function actionToAbilityPatch(row: ActionRow): GrantAbilityRuleDraft {
  return {
    kind: 'grantAbility',
    name: row.name,
    actionCost: toActionCost(row.action_type === 'reaction' || row.action_type === 'free' ? row.action_type : String(row.action_cost ?? '')),
    description: row.description ? sanitizeFoundryText(row.description) : '',
    traits: parseTraits(row.traits),
  }
}

function featToAbilityPatch(row: FeatEntityRow): GrantAbilityRuleDraft {
  const parsed = parseFeatRaw(row)
  return {
    kind: 'grantAbility',
    name: row.name,
    actionCost: parsed.actionCost,
    description: parsed.description,
    traits: parsed.traits,
  }
}

function spellToRulePatch(row: SpellSearchResult, fallbackTradition: string): GrantSpellRuleDraft {
  const traditions = parseTraits(row.traditions)
  const traits = parseTraits(row.traits)
  return {
    kind: 'grantSpell',
    name: row.name,
    rank: row.heightenedToRank ?? row.rank,
    tradition: traditions[0] ?? fallbackTradition,
    castType: traits.includes('focus') ? 'focus' : 'innate',
    foundryId: row.id,
  }
}

interface AbilityTemplatePickerProps {
  onPick: (rule: GrantAbilityRuleDraft) => void
}

function AbilityTemplatePicker({ onPick }: AbilityTemplatePickerProps) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [actions, setActions] = useState<ActionRow[]>([])
  const [feats, setFeats] = useState<FeatEntityRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 200)
    return () => clearTimeout(id)
  }, [query])

  useEffect(() => {
    const searchTerm = debounced.trim()
    if (searchTerm.length < 2) {
      setActions([])
      setFeats([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const [nextActions, nextFeats] = await Promise.all([
          searchActions(searchTerm, TEMPLATE_RESULT_LIMIT),
          searchFeats(searchTerm, TEMPLATE_RESULT_LIMIT),
        ])
        if (cancelled) return
        setActions(nextActions)
        setFeats(nextFeats)
      } catch {
        if (!cancelled) {
          setActions([])
          setFeats([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [debounced])

  const emptyText = useMemo(() => {
    if (loading) return 'Searching abilities...'
    if (debounced.trim().length < 2) return 'Type at least 2 characters to search actions and feats.'
    if (actions.length === 0 && feats.length === 0) return 'No abilities found.'
    return null
  }, [actions.length, debounced, feats.length, loading])

  return (
    <div className="space-y-2 rounded-md border border-border/50 bg-background/35 p-2">
      <Label>Search Ability / Feat</Label>
      <SearchInput
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Sneak Attack, Shield Block..."
        className="h-8 bg-background/60 text-sm"
        loading={loading}
      />
      {emptyText && <p className="text-xs text-muted-foreground">{emptyText}</p>}
      {(actions.length > 0 || feats.length > 0) && (
        <div className="grid gap-1">
          {actions.map((row) => (
            <button
              key={`action-${row.id}`}
              type="button"
              className="rounded-md border border-border/40 bg-secondary/25 px-2 py-1.5 text-left hover:border-primary/50 hover:bg-secondary/50"
              onClick={() => onPick(actionToAbilityPatch(row))}
            >
              <span className="block truncate text-sm font-medium">{row.name}</span>
              <span className="block truncate text-[11px] text-muted-foreground">Action · {row.action_category}</span>
            </button>
          ))}
          {feats.map((row) => (
            <button
              key={`feat-${row.id}`}
              type="button"
              className="rounded-md border border-border/40 bg-secondary/25 px-2 py-1.5 text-left hover:border-primary/50 hover:bg-secondary/50"
              onClick={() => onPick(featToAbilityPatch(row))}
            >
              <span className="block truncate text-sm font-medium">{row.name}</span>
              <span className="block truncate text-[11px] text-muted-foreground">Feat{row.level != null ? ` · Level ${row.level}` : ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface SpellTemplatePickerProps {
  fallbackTradition: string
  onPick: (rule: GrantSpellRuleDraft) => void
}

function SpellTemplatePicker({ fallbackTradition, onPick }: SpellTemplatePickerProps) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [results, setResults] = useState<SpellSearchResult[]>([])
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
    void (async () => {
      try {
        const rows = await searchSpells(searchTerm)
        if (!cancelled) setResults(rows.slice(0, TEMPLATE_RESULT_LIMIT))
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

  const emptyText = useMemo(() => {
    if (loading) return 'Searching spells...'
    if (debounced.trim().length < 2) return 'Type at least 2 characters to search spells.'
    if (results.length === 0) return 'No spells found.'
    return null
  }, [debounced, loading, results.length])

  return (
    <div className="space-y-2 rounded-md border border-border/50 bg-background/35 p-2">
      <Label>Search Spell</Label>
      <SearchInput
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Invisibility, Shield..."
        className="h-8 bg-background/60 text-sm"
        loading={loading}
      />
      {emptyText && <p className="text-xs text-muted-foreground">{emptyText}</p>}
      {results.length > 0 && (
        <div className="grid gap-1">
          {results.map((row) => {
            const traditions = parseTraits(row.traditions)
            return (
              <button
                key={row.id}
                type="button"
                className="rounded-md border border-border/40 bg-secondary/25 px-2 py-1.5 text-left hover:border-primary/50 hover:bg-secondary/50"
                onClick={() => onPick(spellToRulePatch(row, fallbackTradition))}
              >
                <span className="block truncate text-sm font-medium">{row.name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  Rank {row.heightenedToRank ?? row.rank}{traditions.length > 0 ? ` · ${traditions.join(', ')}` : ''}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function CustomItemRulesTab({ item, onChange }: CustomItemRulesTabProps) {
  const rules = useMemo(() => parseRules(item.rules_json), [item.rules_json])

  function updateRule(index: number, patch: Partial<CustomItemRuleDraft>) {
    const next = rules.map((rule, i) => i === index ? { ...rule, ...patch } as CustomItemRuleDraft : rule)
    onChange(serializeRules(next))
  }

  function removeRule(index: number) {
    onChange(serializeRules(rules.filter((_, i) => i !== index)))
  }

  function addRule(rule: CustomItemRuleDraft) {
    onChange(serializeRules([...rules, rule]))
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => addRule({ kind: 'resistance', damageType: 'physical', value: 5 })}>
          <Plus className="h-4 w-4" /> Resistance
        </Button>
        <Button size="sm" variant="outline" onClick={() => addRule({ kind: 'flatModifier', selector: 'stealth', modifierType: 'item', value: 1 })}>
          <Plus className="h-4 w-4" /> Modifier
        </Button>
        <Button size="sm" variant="outline" onClick={() => addRule({ kind: 'abilityModDelta', ability: 'dex', value: 1 })}>
          <Plus className="h-4 w-4" /> Ability
        </Button>
        <Button size="sm" variant="outline" onClick={() => addRule({ kind: 'grantAbility', name: 'Shield Block', actionCost: 'reaction', description: '' })}>
          <Plus className="h-4 w-4" /> Ability Card
        </Button>
        <Button size="sm" variant="outline" onClick={() => addRule({ kind: 'grantSpell', name: 'Shield', rank: 1, tradition: 'arcane', castType: 'innate', frequency: { kind: 'per', max: 1, per: 'day' } })}>
          <Plus className="h-4 w-4" /> Spell
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
          No internal rules. Export remains clean either way.
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, index) => (
            <div key={`${rule.kind}-${index}`} className="rounded-md border border-border/50 bg-secondary/20 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{rule.kind}</span>
                <Button variant="ghost" size="icon" onClick={() => removeRule(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {rule.kind === 'resistance' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Damage Type</Label>
                    <Input value={rule.damageType} onChange={(e) => updateRule(index, { damageType: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Value</Label>
                    <Input type="number" value={rule.value} onChange={(e) => updateRule(index, { value: Number(e.target.value) || 0 })} />
                  </div>
                </div>
              )}

              {rule.kind === 'flatModifier' && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Selector</Label>
                    <Input value={rule.selector} onChange={(e) => updateRule(index, { selector: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Input value={rule.modifierType} onChange={(e) => updateRule(index, { modifierType: toModifierType(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Value</Label>
                    <Input type="number" value={rule.value} onChange={(e) => updateRule(index, { value: Number(e.target.value) || 0 })} />
                  </div>
                </div>
              )}

              {rule.kind === 'abilityModDelta' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Ability</Label>
                    <Input value={rule.ability} onChange={(e) => updateRule(index, { ability: toAbility(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Value</Label>
                    <Input type="number" value={rule.value} onChange={(e) => updateRule(index, { value: Number(e.target.value) || 0 })} />
                  </div>
                </div>
              )}

              {rule.kind === 'grantAbility' && (
                <div className="space-y-3">
                  <AbilityTemplatePicker onPick={(picked) => updateRule(index, picked)} />
                  <div className="grid grid-cols-[1fr_9rem] gap-3">
                    <div className="space-y-1.5">
                      <Label>Name</Label>
                      <Input value={rule.name} onChange={(e) => updateRule(index, { name: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Action Cost</Label>
                      <Input value={String(rule.actionCost ?? '')} onChange={(e) => updateRule(index, { actionCost: toActionCost(e.target.value) })} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Textarea value={rule.description} onChange={(e) => updateRule(index, { description: e.target.value })} />
                  </div>
                </div>
              )}

              {rule.kind === 'grantSpell' && (
                <div className="space-y-3">
                  <SpellTemplatePicker
                    fallbackTradition={rule.tradition}
                    onPick={(picked) => updateRule(index, picked)}
                  />
                  <div className="grid grid-cols-[1fr_6rem_8rem_8rem] gap-3">
                    <div className="space-y-1.5">
                      <Label>Name</Label>
                      <Input value={rule.name} onChange={(e) => updateRule(index, { name: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Rank</Label>
                      <Input type="number" value={rule.rank} onChange={(e) => updateRule(index, { rank: Number(e.target.value) || 0 })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Tradition</Label>
                      <Input value={rule.tradition} onChange={(e) => updateRule(index, { tradition: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Cast Type</Label>
                      <Input value={rule.castType ?? 'innate'} onChange={(e) => updateRule(index, { castType: toCastType(e.target.value) })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-[1fr_8rem_8rem_8rem] gap-3">
                    <div className="space-y-1.5">
                      <Label>Foundry ID</Label>
                      <Input value={rule.foundryId ?? ''} onChange={(e) => updateRule(index, { foundryId: e.target.value || null })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Frequency</Label>
                      <Input value={frequencyText(rule.frequency)} onChange={(e) => updateRule(index, { frequency: toFrequency(e.target.value) })} placeholder="1/day" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>DC</Label>
                      <Input type="number" value={rule.spellDc ?? ''} onChange={(e) => updateRule(index, { spellDc: e.target.value ? Number(e.target.value) : undefined })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Attack</Label>
                      <Input type="number" value={rule.spellAttack ?? ''} onChange={(e) => updateRule(index, { spellAttack: e.target.value ? Number(e.target.value) : undefined })} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
