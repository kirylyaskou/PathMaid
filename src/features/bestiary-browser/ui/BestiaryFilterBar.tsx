import { useCallback, useEffect, useMemo, useState } from 'react'
import { Input } from '@/shared/ui/input'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { Button } from '@/shared/ui/button'
import { Check, ChevronsUpDown, RotateCcw } from 'lucide-react'
import { useBestiaryStore } from '../model/store'
import { fetchDistinctSources } from '@/shared/api'
import { useShallow } from 'zustand/react/shallow'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'

const RARITIES = ['common', 'uncommon', 'rare', 'unique'] as const
const CREATURE_TYPES = [
  'aberration', 'animal', 'astral', 'beast', 'celestial', 'construct',
  'dragon', 'dream', 'elemental', 'ethereal', 'fey', 'fiend', 'fungus',
  'giant', 'humanoid', 'monitor', 'ooze', 'petitioner', 'plant', 'undead',
] as const
const CREATURE_SIZES = [
  { value: 'tiny', label: 'Tiny' },
  { value: 'sm', label: 'Small' },
  { value: 'med', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'huge', label: 'Huge' },
  { value: 'grg', label: 'Gargantuan' },
] as const

interface FilterOption {
  value: string
  label: string
  className?: string
}

interface SearchableFilterSelectProps {
  value: string
  options: FilterOption[]
  widthClass: string
  contentClassName?: string
  searchPlaceholder: string
  emptyText: string
  onChange: (value: string) => void
}

function SearchableFilterSelect({
  value,
  options,
  widthClass,
  contentClassName,
  searchPlaceholder,
  emptyText,
  onChange,
}: SearchableFilterSelectProps) {
  const [open, setOpen] = useState(false)
  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [options, value],
  )

  const handleSelect = useCallback((nextValue: string) => {
    onChange(nextValue)
    setOpen(false)
  }, [onChange])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'h-7 justify-between px-3 text-xs font-normal bg-background/60',
            widthClass,
          )}
        >
          <span className="min-w-0 truncate">{selected?.label}</span>
          <ChevronsUpDown className="ml-2 size-3 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn('p-0', contentClassName ?? widthClass)} align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="h-8 text-xs" />
          <CommandList className="max-h-[320px]">
            <CommandEmpty>{emptyText}</CommandEmpty>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={`${option.label} ${option.value}`}
                onSelect={() => handleSelect(option.value)}
                className={cn('text-xs', option.className)}
              >
                <Check
                  className={cn(
                    'size-3',
                    option.value === value ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <span className="truncate">{option.label}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function BestiaryFilterBar() {
  const { t } = useTranslation('common')
  const { filters, setFilter, resetFilters } = useBestiaryStore(
    useShallow((s) => ({ filters: s.filters, setFilter: s.setFilter, resetFilters: s.resetFilters }))
  )
  const [sources, setSources] = useState<{ pack: string; name: string }[]>([])

  useEffect(() => {
    fetchDistinctSources().then(setSources)
  }, [])

  const hasActiveFilters =
    filters.levelMin != null ||
    filters.levelMax != null ||
    filters.rarity != null ||
    filters.size != null ||
    filters.traits.length > 0 ||
    filters.source != null

  const rarityOptions = useMemo<FilterOption[]>(() => [
    { value: '__all__', label: t('bestiaryFilter.allRarities') },
    ...RARITIES.map((rarity) => ({ value: rarity, label: rarity, className: 'capitalize' })),
  ], [t])
  const typeOptions = useMemo<FilterOption[]>(() => [
    { value: '__all__', label: t('bestiaryFilter.allTypes') },
    ...CREATURE_TYPES.map((type) => ({ value: type, label: type, className: 'capitalize' })),
  ], [t])
  const sizeOptions = useMemo<FilterOption[]>(() => [
    { value: '__all__', label: t('bestiaryFilter.allSizes') },
    ...CREATURE_SIZES,
  ], [t])
  const sourceOptions = useMemo<FilterOption[]>(() => [
    { value: '__all__', label: t('bestiaryFilter.allSources') },
    ...Array.from(new Set(sources.map((source) => source.name)))
      .map((sourceName) => ({ value: sourceName, label: sourceName })),
  ], [sources, t])

  const handleRarityChange = useCallback((value: string) => {
    setFilter('rarity', value === '__all__' ? null : value)
  }, [setFilter])
  const handleTypeChange = useCallback((value: string) => {
    setFilter('traits', value === '__all__' ? [] : [value])
  }, [setFilter])
  const handleSizeChange = useCallback((value: string) => {
    setFilter('size', value === '__all__' ? null : value)
  }, [setFilter])
  const handleSourceChange = useCallback((value: string) => {
    setFilter('source', value === '__all__' ? null : value)
  }, [setFilter])

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border/50 bg-card/50">
      {/* Level range */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">{t('bestiaryFilter.lvl')}</span>
        <Input
          type="number"
          min={-1}
          max={25}
          placeholder={t('bestiaryFilter.min')}
          value={filters.levelMin ?? ''}
          onChange={(e) => setFilter('levelMin', e.target.value ? Number(e.target.value) : null)}
          className="w-16 h-7 text-xs"
        />
        <span className="text-xs text-muted-foreground">–</span>
        <Input
          type="number"
          min={-1}
          max={25}
          placeholder={t('bestiaryFilter.max')}
          value={filters.levelMax ?? ''}
          onChange={(e) => setFilter('levelMax', e.target.value ? Number(e.target.value) : null)}
          className="w-16 h-7 text-xs"
        />
      </div>

      <SearchableFilterSelect
        value={filters.rarity ?? '__all__'}
        options={rarityOptions}
        widthClass="w-[132px]"
        searchPlaceholder={t('bestiaryFilter.searchRarity')}
        emptyText={t('bestiaryFilter.noOptions')}
        onChange={handleRarityChange}
      />

      <SearchableFilterSelect
        value={filters.traits[0] ?? '__all__'}
        options={typeOptions}
        widthClass="w-[132px]"
        searchPlaceholder={t('bestiaryFilter.searchType')}
        emptyText={t('bestiaryFilter.noOptions')}
        onChange={handleTypeChange}
      />

      <SearchableFilterSelect
        value={filters.size ?? '__all__'}
        options={sizeOptions}
        widthClass="w-[122px]"
        searchPlaceholder={t('bestiaryFilter.searchSize')}
        emptyText={t('bestiaryFilter.noOptions')}
        onChange={handleSizeChange}
      />

      {/* Source — key + value are the human-readable name (unique);
          pack is non-unique (most entries are pack='pf2e'), which caused
          "two children with the same key" spam and broke the filter by
          collapsing every Monster Core / Bestiary 1/2 entry into one pf2e
          option. Backend query uses COALESCE(source_name, source_pack). */}
      {sources.length > 0 && (
        <SearchableFilterSelect
          value={filters.source ?? '__all__'}
          options={sourceOptions}
          widthClass="w-[190px]"
          contentClassName="w-[360px] max-w-[calc(100vw-2rem)]"
          searchPlaceholder={t('bestiaryFilter.searchSource')}
          emptyText={t('bestiaryFilter.noOptions')}
          onChange={handleSourceChange}
        />
      )}

      {/* Reset */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={resetFilters}>
          <RotateCcw className="w-3 h-3 mr-1" />
          {t('bestiaryFilter.reset')}
        </Button>
      )}
    </div>
  )
}
