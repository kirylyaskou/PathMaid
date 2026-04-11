import { useState, useEffect } from 'react'
import { SearchInput } from '@/shared/ui/search-input'
import { ScrollArea } from '@/shared/ui/scroll-area'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/shared/ui/resizable'
import { CreatureCard, CreatureStatBlock, fetchCreatureStatBlockData, toCreature } from '@/entities/creature'
import type { CreatureStatBlockData } from '@/entities/creature'
import { BestiaryFilterBar, useBestiaryStore } from '@/features/bestiary-browser'
import { searchCreaturesFiltered } from '@/shared/api'
import type { CreatureRow } from '@/shared/api'
import { useShallow } from 'zustand/react/shallow'

export function BestiaryPage() {
  const { searchQuery, setSearchQuery, filters, selectedCreatureId, setSelectedCreatureId } =
    useBestiaryStore(
      useShallow((s) => ({
        searchQuery: s.searchQuery,
        setSearchQuery: s.setSearchQuery,
        filters: s.filters,
        selectedCreatureId: s.selectedCreatureId,
        setSelectedCreatureId: s.setSelectedCreatureId,
      }))
    )

  const [results, setResults] = useState<CreatureRow[]>([])
  const [loading, setLoading] = useState(false)
  const [statBlock, setStatBlock] = useState<CreatureStatBlockData | null>(null)
  const [statBlockError, setStatBlockError] = useState<string | null>(null)

  // Search with debounce
  useEffect(() => {
    let cancelled = false
    const search = async () => {
      setLoading(true)
      try {
        const rows = await searchCreaturesFiltered(
          {
            query: searchQuery || undefined,
            levelMin: filters.levelMin,
            levelMax: filters.levelMax,
            rarity: filters.rarity,
            traits: filters.traits.length > 0 ? filters.traits : undefined,
            source: filters.source,
          },
          200
        )
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
  }, [searchQuery, filters])

  // Load stat block for selected creature
  useEffect(() => {
    if (!selectedCreatureId) {
      setStatBlock(null)
      setStatBlockError(null)
      return
    }
    let cancelled = false
    fetchCreatureStatBlockData(selectedCreatureId).then((data) => {
      if (cancelled) return
      if (!data) {
        setStatBlockError('Creature not found in database')
        setStatBlock(null)
        return
      }
      setStatBlock(data)
      setStatBlockError(null)
    }).catch((err) => {
      if (cancelled) return
      console.error('Failed to load creature stat block:', err)
      setStatBlockError(`Failed to load stat block: ${err instanceof Error ? err.message : String(err)}`)
      setStatBlock(null)
    })
    return () => {
      cancelled = true
    }
  }, [selectedCreatureId])

  const hasActiveFilters =
    filters.levelMin != null ||
    filters.levelMax != null ||
    filters.rarity != null ||
    filters.traits.length > 0 ||
    filters.source != null

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {/* Left — Search + Filter + List */}
      <ResizablePanel defaultSize={40} minSize={30} maxSize={55}>
        <div className="flex flex-col h-full">
          {/* Search */}
          <div className="p-3 border-b border-border/50">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bestiary..."
              className="h-9"
            />
          </div>

          {/* Filters */}
          <BestiaryFilterBar />

          {/* Results count */}
          <div className="px-3 py-1.5 text-xs text-muted-foreground border-b border-border/30">
            {loading ? 'Searching...' : `${results.length} creature${results.length !== 1 ? 's' : ''}`}
          </div>

          {/* Creature list */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1.5">
              {!loading && results.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {searchQuery.trim() || hasActiveFilters
                    ? 'No creatures match your filters'
                    : 'No creatures loaded — sync Foundry VTT data first'}
                </p>
              )}
              {results.map((row) => (
                <CreatureCard
                  key={row.id}
                  creature={toCreature(row)}
                  compact
                  onClick={() => setSelectedCreatureId(row.id)}
                  className={selectedCreatureId === row.id ? 'border-primary/50 bg-primary/5' : ''}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Right — Stat block detail */}
      <ResizablePanel defaultSize={60} minSize={40}>
        {statBlock ? (
          <ScrollArea className="h-full">
            <div className="p-4">
              <CreatureStatBlock creature={statBlock} />
            </div>
          </ScrollArea>
        ) : statBlockError ? (
          <div className="flex items-center justify-center h-full text-destructive">
            <p className="text-sm max-w-md text-center">{statBlockError}</p>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">Select a creature to view its stat block</p>
          </div>
        )}
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
