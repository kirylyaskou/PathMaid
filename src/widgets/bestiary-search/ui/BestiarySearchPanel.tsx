import { useState, useCallback, useEffect } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { CreatureCard, toCreature } from '@/entities/creature'
import { searchCreatures, fetchCreatures } from '@/shared/api'
import type { CreatureRow } from '@/shared/api'
import { useCombatantStore } from '@/entities/combatant'
import { createCombatantFromCreature } from '@/features/combat-tracker'
import { useShallow } from 'zustand/react/shallow'

export function BestiarySearchPanel() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CreatureRow[]>([])
  const [loading, setLoading] = useState(false)
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

  const handleAdd = useCallback(
    (row: CreatureRow) => {
      const creature = toCreature(row)
      const combatant = createCombatantFromCreature(
        creature.id,
        creature.name,
        creature.perception,
        creature.hp,
        combatants
      )
      addCombatant(combatant)
    },
    [combatants, addCombatant]
  )

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bestiary..."
            className="pl-8 h-8 text-sm"
          />
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
          {results.map((row) => (
            <CreatureCard
              key={row.id}
              creature={toCreature(row)}
              compact
              onAdd={() => handleAdd(row)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
