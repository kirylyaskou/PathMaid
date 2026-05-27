import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/ui/command'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Button } from '@/shared/ui/button'
import { ChevronsUpDown, X, Plus } from 'lucide-react'
import { getBenchmark } from '@engine'
import type { Tier } from '@engine'
import type { CreatureStatBlockData } from '@/entities/creature'
import { getTraitLabel, getTraitSlugs, useCurrentLocale } from '@/shared/i18n'
import { normalizeTraitList, normalizeTraitSlug } from '@/shared/lib/trait-normalize'
import { cn } from '@/shared/lib/utils'
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

const TRAIT_OPTIONS = getTraitSlugs()
const TRAIT_OPTION_SET = new Set(TRAIT_OPTIONS)

function isAllowedStrikeTrait(slug: string): boolean {
  return TRAIT_OPTION_SET.has(slug) || /^(?:reach|range|thrown)-\d+$/.test(slug)
}

export function StrikesTab({ state, dispatch }: BuilderTabsProps) {
  const { t } = useTranslation('common')
  const { form } = state
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-base font-semibold">{t('customCreatureBuilder.strikesTab.heading')}</h2>
      {form.strikes.length === 0 && (
        <div className="flex items-center justify-between p-4 rounded-md border border-dashed border-border/50 bg-secondary/20">
          <p className="text-sm text-muted-foreground">{t('customCreatureBuilder.strikesTab.noStrikesDefined')}</p>
          <Button
            size="sm"
            onClick={() => dispatch({ type: 'ADD_STRIKE', strike: { ...EMPTY_STRIKE } })}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            {t('customCreatureBuilder.strikesTab.addStrike')}
          </Button>
        </div>
      )}
      {form.strikes.map((strike, i) => (
        <StrikeEditor
          key={i}
          strike={strike}
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
          {t('customCreatureBuilder.strikesTab.addStrike')}
        </Button>
      )}
    </div>
  )
}

interface StrikeEditorProps {
  strike: Strike
  level: number
  onChange: (s: Strike) => void
  onRemove: () => void
}

function StrikeEditor({ strike, level, onChange, onRemove }: StrikeEditorProps) {
  const { t } = useTranslation('common')
  const locale = useCurrentLocale()
  const [traitsOpen, setTraitsOpen] = useState(false)
  const traits = useMemo(() => normalizeTraitList(strike.traits), [strike.traits])
  const availableTraits = useMemo(
    () => TRAIT_OPTIONS.filter((trait) => !traits.includes(trait)),
    [traits],
  )

  function addTrait(value: string) {
    const trait = normalizeTraitSlug(value)
    if (!isAllowedStrikeTrait(trait) || traits.includes(trait)) return
    onChange({ ...strike, traits: [...traits, trait] })
    setTraitsOpen(false)
  }
  function removeTrait(slug: string) {
    onChange({ ...strike, traits: traits.filter((trait) => trait !== slug) })
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
          placeholder={t('customCreatureBuilder.strikesTab.strikeNamePlaceholder')}
          className="flex-1"
        />
        <button
          type="button"
          aria-label={t('customCreatureBuilder.strikesTab.removeStrikeAriaLabel')}
          onClick={onRemove}
          className="p-1 text-muted-foreground hover:text-destructive"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>{t('customCreatureBuilder.strikesTab.attackModifier')}</Label>
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
            <Label>{t('customCreatureBuilder.strikesTab.damage')}</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] uppercase tracking-wider font-semibold text-muted-foreground border-border/60 bg-secondary/30 hover:bg-secondary/50"
                  title={t('customCreatureBuilder.strikesTab.setToBenchmarkTitle')}
                >
                  {t('customCreatureBuilder.strikesTab.setToTier')}
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
                  aria-label={t('customCreatureBuilder.strikesTab.removeDamageRowAriaLabel')}
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
              {t('customCreatureBuilder.strikesTab.addDamageRow')}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('customCreatureBuilder.strikesTab.traits')}</Label>
        <Popover open={traitsOpen} onOpenChange={setTraitsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors',
                'hover:border-primary/60 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                'text-muted-foreground',
              )}
            >
              <span>{t('customCreatureBuilder.strikesTab.addTraitPlaceholder')}</span>
              <ChevronsUpDown className="size-4 opacity-60" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command>
              <CommandInput placeholder={t('customCreatureBuilder.strikesTab.addTraitPlaceholder')} />
              <CommandList className="max-h-[260px]">
                <CommandEmpty>{t('spells.noTraits')}</CommandEmpty>
                {availableTraits.map((trait) => {
                  const label = getTraitLabel(trait, locale)
                  return (
                    <CommandItem
                      key={trait}
                      value={`${trait} ${label}`}
                      onSelect={() => addTrait(trait)}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="font-mono text-xs">{trait}</span>
                      {label !== trait && (
                        <span className="truncate text-xs text-muted-foreground">{label}</span>
                      )}
                    </CommandItem>
                  )
                })}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {traits.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {traits.map((trait) => (
              <span
                key={trait}
                className="inline-flex items-center gap-1 text-xs rounded bg-secondary/50 border border-border/50 px-2 py-0.5"
                title={getTraitLabel(trait, locale)}
              >
                {trait}
                <button
                  type="button"
                  aria-label={t('customCreatureBuilder.strikesTab.removeTraitAriaLabel', { name: trait })}
                  onClick={() => removeTrait(trait)}
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
