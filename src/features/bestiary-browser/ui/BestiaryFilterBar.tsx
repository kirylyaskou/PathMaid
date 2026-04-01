import { useEffect, useState } from 'react'
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Button } from '@/shared/ui/button'
import { RotateCcw } from 'lucide-react'
import { useBestiaryStore } from '../model/store'
import { fetchDistinctSources } from '@/shared/api'
import { useShallow } from 'zustand/react/shallow'

const RARITIES = ['common', 'uncommon', 'rare', 'unique'] as const
const CREATURE_TYPES = [
  'aberration', 'animal', 'astral', 'beast', 'celestial', 'construct',
  'dragon', 'dream', 'elemental', 'ethereal', 'fey', 'fiend', 'fungus',
  'giant', 'humanoid', 'monitor', 'ooze', 'petitioner', 'plant', 'undead',
] as const

export function BestiaryFilterBar() {
  const { filters, setFilter, resetFilters } = useBestiaryStore(
    useShallow((s) => ({ filters: s.filters, setFilter: s.setFilter, resetFilters: s.resetFilters }))
  )
  const [sources, setSources] = useState<string[]>([])

  useEffect(() => {
    fetchDistinctSources().then(setSources)
  }, [])

  const hasActiveFilters =
    filters.levelMin != null ||
    filters.levelMax != null ||
    filters.rarity != null ||
    filters.traits.length > 0 ||
    filters.source != null

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border/50 bg-card/50">
      {/* Level range */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">Lvl</span>
        <Input
          type="number"
          min={-1}
          max={25}
          placeholder="Min"
          value={filters.levelMin ?? ''}
          onChange={(e) => setFilter('levelMin', e.target.value ? Number(e.target.value) : null)}
          className="w-16 h-7 text-xs"
        />
        <span className="text-xs text-muted-foreground">–</span>
        <Input
          type="number"
          min={-1}
          max={25}
          placeholder="Max"
          value={filters.levelMax ?? ''}
          onChange={(e) => setFilter('levelMax', e.target.value ? Number(e.target.value) : null)}
          className="w-16 h-7 text-xs"
        />
      </div>

      {/* Rarity */}
      <Select
        value={filters.rarity ?? '__all__'}
        onValueChange={(v) => setFilter('rarity', v === '__all__' ? null : v)}
      >
        <SelectTrigger className="w-[110px] h-7 text-xs">
          <SelectValue placeholder="Rarity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All Rarities</SelectItem>
          {RARITIES.map((r) => (
            <SelectItem key={r} value={r} className="capitalize">
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Creature Type (mapped to traits) */}
      <Select
        value={filters.traits[0] ?? '__all__'}
        onValueChange={(v) => setFilter('traits', v === '__all__' ? [] : [v])}
      >
        <SelectTrigger className="w-[120px] h-7 text-xs">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All Types</SelectItem>
          {CREATURE_TYPES.map((t) => (
            <SelectItem key={t} value={t} className="capitalize">
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Source */}
      {sources.length > 0 && (
        <Select
          value={filters.source ?? '__all__'}
          onValueChange={(v) => setFilter('source', v === '__all__' ? null : v)}
        >
          <SelectTrigger className="w-[140px] h-7 text-xs">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Sources</SelectItem>
            {sources.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Reset */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={resetFilters}>
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset
        </Button>
      )}
    </div>
  )
}
