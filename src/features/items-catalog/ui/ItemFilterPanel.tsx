import { useState, useEffect } from 'react'
import { Search, Check, X } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import { Popover, PopoverTrigger, PopoverContent } from '@/shared/ui/popover'
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/shared/ui/command'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/ui/select'
import { ITEM_TYPE_LABELS, ITEM_TYPE_COLORS, RARITY_COLORS } from '@/entities/item'
import { fetchDistinctItemTraits, fetchDistinctItemSources, fetchDistinctSubcategories } from '@/shared/api'
import { useItemsCatalogStore } from '../model/store'
import { cn } from '@/shared/lib/utils'
import { logError } from '@/shared/lib/error'

const ITEM_TYPES = ['weapon', 'armor', 'shield', 'consumable', 'equipment', 'treasure', 'backpack', 'kit', 'book', 'effect'] as const
const RARITIES = ['common', 'uncommon', 'rare', 'unique'] as const

export function ItemFilterPanel() {
  const query = useItemsCatalogStore((s) => s.query)
  const selectedType = useItemsCatalogStore((s) => s.selectedType)
  const minLevel = useItemsCatalogStore((s) => s.minLevel)
  const maxLevel = useItemsCatalogStore((s) => s.maxLevel)
  const selectedRarity = useItemsCatalogStore((s) => s.selectedRarity)
  const selectedTraits = useItemsCatalogStore((s) => s.selectedTraits)
  const selectedSource = useItemsCatalogStore((s) => s.selectedSource)
  const selectedSubcategory = useItemsCatalogStore((s) => s.selectedSubcategory)

  const setQuery = useItemsCatalogStore((s) => s.setQuery)
  const setSelectedType = useItemsCatalogStore((s) => s.setSelectedType)
  const setMinLevel = useItemsCatalogStore((s) => s.setMinLevel)
  const setMaxLevel = useItemsCatalogStore((s) => s.setMaxLevel)
  const setSelectedRarity = useItemsCatalogStore((s) => s.setSelectedRarity)
  const toggleTrait = useItemsCatalogStore((s) => s.toggleTrait)
  const setSelectedSource = useItemsCatalogStore((s) => s.setSelectedSource)
  const setSelectedSubcategory = useItemsCatalogStore((s) => s.setSelectedSubcategory)

  const [traits, setTraits] = useState<string[]>([])
  const [sources, setSources] = useState<string[]>([])
  const [subcategories, setSubcategories] = useState<string[]>([])
  const [traitsOpen, setTraitsOpen] = useState(false)

  useEffect(() => {
    fetchDistinctItemTraits().then(setTraits).catch(logError('fetch-item-traits'))
    fetchDistinctItemSources().then(setSources).catch(logError('fetch-item-sources'))
  }, [])

  useEffect(() => {
    fetchDistinctSubcategories(selectedType).then(setSubcategories).catch(logError('fetch-item-subcategories'))
  }, [selectedType])

  const showSubcategory = selectedType === 'weapon' || selectedType === 'consumable'

  return (
    <div className="p-3 border-b border-border/50 space-y-2 shrink-0">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search items…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      {/* Type pills */}
      <div className="flex flex-wrap gap-1">
        {ITEM_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setSelectedType(selectedType === t ? null : t)}
            className={cn(
              'px-2 py-0.5 text-[10px] rounded border uppercase tracking-wider font-semibold transition-opacity',
              ITEM_TYPE_COLORS[t],
              selectedType && selectedType !== t && 'opacity-30'
            )}
          >
            {ITEM_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Row: Level + Rarity + Traits + Source + Subcategory */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Level range */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Lv</span>
          <Input
            type="number"
            placeholder="min"
            value={minLevel}
            onChange={(e) => setMinLevel(e.target.value)}
            className="w-14 h-6 text-xs px-1.5"
            min={0}
            max={25}
          />
          <span>–</span>
          <Input
            type="number"
            placeholder="max"
            value={maxLevel}
            onChange={(e) => setMaxLevel(e.target.value)}
            className="w-14 h-6 text-xs px-1.5"
            min={0}
            max={25}
          />
        </div>

        {/* Rarity pills */}
        <div className="flex gap-1">
          {RARITIES.map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRarity(selectedRarity === r ? null : r)}
              className={cn(
                'px-2 py-0.5 text-[10px] rounded border capitalize font-medium transition-colors',
                selectedRarity === r
                  ? cn(RARITY_COLORS[r], 'bg-secondary border-current')
                  : 'text-muted-foreground border-border/40 hover:border-border'
              )}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Traits combobox */}
        <Popover open={traitsOpen} onOpenChange={setTraitsOpen}>
          <PopoverTrigger asChild>
            <button className="h-6 px-2 text-xs border border-border/40 rounded hover:border-border transition-colors text-muted-foreground">
              {selectedTraits.length > 0 ? `${selectedTraits.length} trait${selectedTraits.length !== 1 ? 's' : ''}` : 'Traits'}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search traits..." />
              <CommandList className="max-h-[300px]">
                <CommandEmpty>No traits found.</CommandEmpty>
                {traits.map((trait) => (
                  <CommandItem
                    key={trait}
                    onSelect={() => toggleTrait(trait)}
                    className="flex items-center gap-2 text-xs"
                  >
                    <div className={cn(
                      'w-3 h-3 border rounded-sm flex items-center justify-center shrink-0',
                      selectedTraits.includes(trait) ? 'bg-primary border-primary' : 'border-border'
                    )}>
                      {selectedTraits.includes(trait) && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                    </div>
                    <span className="uppercase tracking-wider text-[10px]">{trait}</span>
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Source dropdown */}
        <Select
          value={selectedSource ?? '__all__'}
          onValueChange={(v) => setSelectedSource(v === '__all__' ? null : v)}
        >
          <SelectTrigger className="h-6 text-xs w-auto min-w-[110px] border-border/40">
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All sources</SelectItem>
            {sources.map((src) => (
              <SelectItem key={src} value={src}>{src}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Subcategory dropdown — only for weapon/consumable */}
        {showSubcategory && (
          <Select
            value={selectedSubcategory ?? '__all__'}
            onValueChange={(v) => setSelectedSubcategory(v === '__all__' ? null : v)}
          >
            <SelectTrigger className="h-6 text-xs w-auto min-w-[130px] border-border/40">
              <SelectValue placeholder="All subcategories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All subcategories</SelectItem>
              {subcategories.map((sub) => (
                <SelectItem key={sub} value={sub}>{sub}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Selected trait chips */}
      {selectedTraits.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTraits.map((trait) => (
            <button
              key={trait}
              onClick={() => toggleTrait(trait)}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider hover:bg-destructive/20 hover:text-destructive hover:border-destructive/30 transition-colors"
            >
              {trait}
              <X className="w-2.5 h-2.5" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
