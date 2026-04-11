import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import { SearchInput } from '@/shared/ui/search-input'
import { Popover, PopoverTrigger, PopoverContent } from '@/shared/ui/popover'
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/shared/ui/command'
import { fetchDistinctSpellTraits } from '@/shared/api'
import { TRADITION_COLORS } from '@/entities/spell'
import { useSpellsCatalogStore } from '../model/useSpellsCatalogStore'
import { cn } from '@/shared/lib/utils'
import { logError } from '@/shared/lib/error'

const RANKS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const
const ACTION_COSTS = [
  { value: 'free', label: '◇' },
  { value: 'reaction', label: '↺' },
  { value: '1', label: '◆' },
  { value: '2', label: '◆◆' },
  { value: '3', label: '◆◆◆' },
] as const
const TRADITIONS = ['arcane', 'divine', 'occult', 'primal'] as const

interface SpellFilterPanelProps {
  isFocusTab: boolean
}

export function SpellFilterPanel({ isFocusTab }: SpellFilterPanelProps) {
  const query = useSpellsCatalogStore((s) => s.query)
  const selectedTradition = useSpellsCatalogStore((s) => s.selectedTradition)
  const selectedTrait = useSpellsCatalogStore((s) => s.selectedTrait)
  const selectedRank = useSpellsCatalogStore((s) => s.selectedRank)
  const selectedActionCost = useSpellsCatalogStore((s) => s.selectedActionCost)

  const setQuery = useSpellsCatalogStore((s) => s.setQuery)
  const setSelectedTradition = useSpellsCatalogStore((s) => s.setSelectedTradition)
  const setSelectedTrait = useSpellsCatalogStore((s) => s.setSelectedTrait)
  const setSelectedRank = useSpellsCatalogStore((s) => s.setSelectedRank)
  const setSelectedActionCost = useSpellsCatalogStore((s) => s.setSelectedActionCost)

  const [allTraits, setAllTraits] = useState<string[]>([])
  const [traitsOpen, setTraitsOpen] = useState(false)

  useEffect(() => {
    fetchDistinctSpellTraits().then(setAllTraits).catch(logError('fetch-spell-traits'))
  }, [])

  return (
    <div className="p-3 border-b border-border/50 space-y-2 shrink-0">
      {/* Row 1: Search */}
      <SearchInput
        placeholder="Search spells…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-8 text-sm"
      />

      {/* Row 2: Tradition buttons (hidden on Focus tab) */}
      {!isFocusTab && (
        <div className="flex flex-wrap gap-1.5">
          {TRADITIONS.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTradition(selectedTradition === t ? null : t)}
              className={cn(
                'px-2 py-0.5 text-[11px] rounded border uppercase tracking-wider font-semibold transition-opacity',
                TRADITION_COLORS[t],
                selectedTradition && selectedTradition !== t && 'opacity-30'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Row 3: Trait combobox */}
      <div className="flex items-center gap-2 flex-wrap">
        <Popover open={traitsOpen} onOpenChange={setTraitsOpen}>
          <PopoverTrigger asChild>
            <button className="h-6 px-2 text-xs border border-border/40 rounded hover:border-border transition-colors text-muted-foreground">
              {selectedTrait ? selectedTrait : 'Traits'}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search traits..." />
              <CommandList className="max-h-[300px]">
                <CommandEmpty>No traits found.</CommandEmpty>
                {allTraits.map((trait) => (
                  <CommandItem
                    key={trait}
                    onSelect={() => {
                      setSelectedTrait(selectedTrait === trait ? null : trait)
                      setTraitsOpen(false)
                    }}
                    className={cn(
                      'text-xs uppercase tracking-wider',
                      selectedTrait === trait && 'text-primary'
                    )}
                  >
                    {trait}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {selectedTrait && (
          <button
            onClick={() => setSelectedTrait(null)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider hover:bg-destructive/20 hover:text-destructive hover:border-destructive/30 transition-colors"
          >
            {selectedTrait}
            <X className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      {/* Row 4: Rank buttons + divider + Action cost buttons */}
      <div className="flex flex-wrap items-center gap-1">
        {RANKS.map((r) => (
          <button
            key={r}
            onClick={() => setSelectedRank(selectedRank === r ? null : r)}
            className={cn(
              'w-7 h-6 text-xs rounded border font-mono transition-colors',
              selectedRank === r
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-secondary/50 text-muted-foreground border-border/40 hover:border-border'
            )}
          >
            {r === 0 ? 'C' : r}
          </button>
        ))}

        <div className="w-px h-4 bg-border/50 mx-1" />

        {ACTION_COSTS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setSelectedActionCost(selectedActionCost === value ? null : value)}
            className={cn(
              'h-6 px-2 text-[13px] rounded border font-mono transition-colors',
              selectedActionCost === value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-secondary/50 text-muted-foreground border-border/40 hover:border-border'
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
