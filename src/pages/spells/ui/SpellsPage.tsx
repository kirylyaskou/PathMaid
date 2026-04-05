import { useState, useEffect, useMemo } from 'react'
import { BookOpen } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/tabs'
import { searchSpells } from '@/shared/api'
import type { SpellRow } from '@/shared/api'
import { SpellReferenceDrawer } from '@/entities/spell'
import { useSpellsCatalogStore, SpellFilterPanel, SpellRankSection } from '@/features/spells-catalog'

const ALL_RANKS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const

export function SpellsPage() {
  const [regularSpells, setRegularSpells] = useState<SpellRow[]>([])
  const [focusSpells, setFocusSpells] = useState<SpellRow[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedSpellId, setSelectedSpellId] = useState<string | null>(null)

  const query = useSpellsCatalogStore((s) => s.query)
  const selectedTradition = useSpellsCatalogStore((s) => s.selectedTradition)
  const selectedTrait = useSpellsCatalogStore((s) => s.selectedTrait)
  const selectedRank = useSpellsCatalogStore((s) => s.selectedRank)
  const selectedActionCost = useSpellsCatalogStore((s) => s.selectedActionCost)
  const activeTab = useSpellsCatalogStore((s) => s.activeTab)
  const setActiveTab = useSpellsCatalogStore((s) => s.setActiveTab)
  const clearFilters = useSpellsCatalogStore((s) => s.clearFilters)
  const hasActiveFilters = useSpellsCatalogStore((s) => s.hasActiveFilters)

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const [regular, focus] = await Promise.all([
          searchSpells(query, selectedRank ?? undefined, selectedTradition ?? undefined, selectedTrait ?? undefined, false),
          searchSpells(query, selectedRank ?? undefined, undefined, selectedTrait ?? undefined, true),
        ])
        setRegularSpells(regular)
        setFocusSpells(focus)
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [query, selectedTradition, selectedTrait, selectedRank])

  const filteredRegular = useMemo(() => {
    if (!selectedActionCost) return regularSpells
    return regularSpells.filter((s) => s.action_cost === selectedActionCost)
  }, [regularSpells, selectedActionCost])

  const filteredFocus = useMemo(() => {
    if (!selectedActionCost) return focusSpells
    return focusSpells.filter((s) => s.action_cost === selectedActionCost)
  }, [focusSpells, selectedActionCost])

  const activeSpells = activeTab === 'focus' ? filteredFocus : filteredRegular

  const spellsByRank = useMemo(() => {
    const map = new Map<number, SpellRow[]>()
    for (const spell of activeSpells) {
      const arr = map.get(spell.rank) ?? []
      arr.push(spell)
      map.set(spell.rank, arr)
    }
    return map
  }, [activeSpells])

  const isFocusTab = activeTab === 'focus'
  const activeCount = activeSpells.length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'spells' | 'focus')}
        className="flex flex-col h-full overflow-hidden"
      >
        <TabsList className="shrink-0 mx-3 mt-3 mb-0 w-auto self-start">
          <TabsTrigger value="spells">Spells</TabsTrigger>
          <TabsTrigger value="focus">Focus Spells</TabsTrigger>
        </TabsList>

        {/* Filter panel — shared across tabs */}
        <SpellFilterPanel isFocusTab={isFocusTab} />

        {/* Count + clear row */}
        <div className="px-3 py-1.5 shrink-0 border-b border-border/30 flex items-center gap-2">
          <p className="text-xs text-muted-foreground flex-1">
            {loading ? 'Searching…' : `${activeCount} spell${activeCount !== 1 ? 's' : ''}`}
          </p>
          {hasActiveFilters() && (
            <button
              onClick={clearFilters}
              className="text-xs text-primary hover:underline"
            >
              clear filters
            </button>
          )}
        </div>

        <TabsContent value="spells" className="flex-1 overflow-y-auto mt-0 data-[state=inactive]:hidden">
          <SpellList
            spellsByRank={spellsByRank}
            isFocusTab={false}
            loading={loading}
            onSpellClick={setSelectedSpellId}
            selectedRank={selectedRank}
            hasQuery={!!(query || selectedTradition || selectedTrait || selectedRank !== null || selectedActionCost)}
          />
        </TabsContent>

        <TabsContent value="focus" className="flex-1 overflow-y-auto mt-0 data-[state=inactive]:hidden">
          <SpellList
            spellsByRank={spellsByRank}
            isFocusTab={true}
            loading={loading}
            onSpellClick={setSelectedSpellId}
            selectedRank={selectedRank}
            hasQuery={!!(query || selectedTrait || selectedRank !== null || selectedActionCost)}
          />
        </TabsContent>
      </Tabs>

      <SpellReferenceDrawer
        spellId={selectedSpellId}
        onClose={() => setSelectedSpellId(null)}
      />
    </div>
  )
}

interface SpellListProps {
  spellsByRank: Map<number, SpellRow[]>
  isFocusTab: boolean
  loading: boolean
  onSpellClick: (spellId: string) => void
  selectedRank: number | null
  hasQuery: boolean
}

function SpellList({ spellsByRank, isFocusTab, loading, onSpellClick, selectedRank, hasQuery }: SpellListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        Searching…
      </div>
    )
  }

  const visibleRanks = ALL_RANKS.filter((r) => {
    if (selectedRank !== null && r !== selectedRank) return false
    return (spellsByRank.get(r)?.length ?? 0) > 0
  })

  if (visibleRanks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
        <BookOpen className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm">
          {hasQuery ? 'No spells match the filters' : 'Run sync to import spells'}
        </p>
      </div>
    )
  }

  return (
    <div>
      {visibleRanks.map((r) => (
        <SpellRankSection
          key={r}
          rank={r}
          spells={spellsByRank.get(r) ?? []}
          defaultOpen={r === 0 || r === 1}
          isFocusTab={isFocusTab}
          onSpellClick={onSpellClick}
        />
      ))}
    </div>
  )
}

