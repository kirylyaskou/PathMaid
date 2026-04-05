import { useState, useCallback, useEffect } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { CreatureCard, toCreature, extractIwr } from '@/entities/creature'
import type { WeakEliteTier } from '@/entities/creature'
import { searchCreatures, fetchCreatures } from '@/shared/api'
import type { CreatureRow } from '@/shared/api'
import { useCombatantStore } from '@/entities/combatant'
import { createCombatantFromCreature } from '@/features/combat-tracker'
import { useShallow } from 'zustand/react/shallow'
import { getHpAdjustment, getStatAdjustment } from '@engine'
import { useDraggable } from '@dnd-kit/core'

function DraggableBestiaryRow({ row, tier, children }: { row: CreatureRow; tier: WeakEliteTier; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `bestiary-${row.id}`,
    data: { type: 'bestiary-add' as const, row, tier },
  })
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{ opacity: isDragging ? 0.4 : 1, cursor: 'grab' }}>
      {children}
    </div>
  )
}

const TIERS: { value: WeakEliteTier; label: string }[] = [
  { value: 'weak', label: 'Weak' },
  { value: 'normal', label: 'Normal' },
  { value: 'elite', label: 'Elite' },
]

export function BestiarySearchPanel() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CreatureRow[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTier, setSelectedTier] = useState<WeakEliteTier>('normal')
  const combatants = useCombatantStore(useShallow((s) => s.combatants))
  const addCombatant = useCombatantStore((s) => s.addCombatant)

  useEffect(() => {
    let cancelled = false
    const search = async () => {
      setLoading(true)
      try {
        const rows = query.trim()
          ? await searchCreatures(query, 50)
          : await fetchCreatures(50, 0)
        if (!cancelled) setResults(rows)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    const timer = setTimeout(search, 200)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  useEffect(() => {
    setSelectedTier('normal')
  }, [query])

  const handleAdd = useCallback(
    (row: CreatureRow) => {
      const creature = toCreature(row)
      const hpDelta = getHpAdjustment(selectedTier, creature.level)
      const adjustedHp = Math.max(1, creature.hp + hpDelta)
      const iwr = extractIwr(row)
      const combatant = createCombatantFromCreature(
        creature.id,
        creature.name,
        creature.perception,
        adjustedHp,
        combatants
      )
      combatant.maxHp = adjustedHp
      combatant.iwrImmunities = iwr.immunities
      combatant.iwrWeaknesses = iwr.weaknesses
      combatant.iwrResistances = iwr.resistances
      addCombatant(combatant)
      setSelectedTier('normal')
    },
    [combatants, addCombatant, selectedTier]
  )

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-border/50 space-y-1.5">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bestiary..."
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">Tier</span>
          {TIERS.map((t) => (
            <button
              key={t.value}
              onClick={() => setSelectedTier(t.value)}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                selectedTier === t.value
                  ? t.value === 'elite'
                    ? 'bg-primary text-primary-foreground'
                    : t.value === 'weak'
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:bg-secondary/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          {loading && results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Searching...</p>
          )}
          {!loading && results.length === 0 && query.trim() && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No creatures found for &quot;{query}&quot;
            </p>
          )}
          {results.map((row) => {
            const creature = toCreature(row)
            const hpDelta = getHpAdjustment(selectedTier, creature.level)
            const statDelta = getStatAdjustment(selectedTier)
            return (
              <DraggableBestiaryRow key={row.id} row={row} tier={selectedTier}>
                <CreatureCard
                  creature={creature}
                  compact
                  onAdd={() => handleAdd(row)}
                />
                {hpDelta !== 0 && (
                  <p className="text-[10px] text-muted-foreground px-2 -mt-0.5 mb-1">
                    HP: {creature.hp} → {Math.max(1, creature.hp + hpDelta)}{' '}
                    <span className={hpDelta > 0 ? 'text-primary' : 'text-destructive'}>
                      ({hpDelta > 0 ? '+' : ''}{hpDelta})
                    </span>
                    {' | '}AC: {creature.ac} → {creature.ac + statDelta}{' '}
                    <span className={statDelta > 0 ? 'text-primary' : 'text-destructive'}>
                      ({statDelta > 0 ? '+' : ''}{statDelta})
                    </span>
                  </p>
                )}
              </DraggableBestiaryRow>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
