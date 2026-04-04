import { useState, useEffect, useCallback } from 'react'
import { Search } from 'lucide-react'
import { useDraggable } from '@dnd-kit/core'
import { Input } from '@/shared/ui/input'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { LevelBadge } from '@/shared/ui/level-badge'
import { CreatureCard, toCreature } from '@/entities/creature'
import type { WeakEliteTier } from '@/entities/creature'
import { searchCreatures, fetchCreatures, searchHazards, getAllHazards } from '@/shared/api'
import type { CreatureRow, HazardRow } from '@/shared/api'
import { useEncounterBuilderStore } from '../model/store'
import { getHpAdjustment, getStatAdjustment } from '@engine'

type SidebarTab = 'creatures' | 'hazards'

const TIERS: { value: WeakEliteTier; label: string }[] = [
  { value: 'weak', label: 'Weak' },
  { value: 'normal', label: 'Normal' },
  { value: 'elite', label: 'Elite' },
]

interface CreatureSearchSidebarProps {
  onAddCreature?: (row: CreatureRow, tier: WeakEliteTier) => void
  onAddHazard?: (hazard: HazardRow) => void
}

function DraggableCreatureRow({
  row,
  tier,
  children,
}: {
  row: CreatureRow
  tier: WeakEliteTier
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `creature-${row.id}`,
    data: { type: 'creature' as const, row, tier },
  })
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{ opacity: isDragging ? 0 : 1 }}>
      {children}
    </div>
  )
}

function DraggableHazardRow({
  hazard,
  children,
}: {
  hazard: HazardRow
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `hazard-${hazard.id}`,
    data: { type: 'hazard' as const, hazard },
  })
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{ opacity: isDragging ? 0 : 1 }}>
      {children}
    </div>
  )
}

export function CreatureSearchSidebar({ onAddCreature, onAddHazard }: CreatureSearchSidebarProps = {}) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('creatures')
  const [query, setQuery] = useState('')

  // Creature state
  const [creatureResults, setCreatureResults] = useState<CreatureRow[]>([])
  const [creatureLoading, setCreatureLoading] = useState(false)
  const [selectedTier, setSelectedTier] = useState<WeakEliteTier>('normal')

  // Hazard state
  const [hazardResults, setHazardResults] = useState<HazardRow[]>([])
  const [hazardLoading, setHazardLoading] = useState(false)

  const addCreatureToDraft = useEncounterBuilderStore((s) => s.addCreatureToDraft)
  const addHazardToDraft = useEncounterBuilderStore((s) => s.addHazardToDraft)

  // Creature search
  useEffect(() => {
    if (activeTab !== 'creatures') return
    let cancelled = false
    const search = async () => {
      setCreatureLoading(true)
      try {
        const rows = query.trim()
          ? await searchCreatures(query, 50)
          : await fetchCreatures(50, 0)
        if (!cancelled) setCreatureResults(rows)
      } finally {
        if (!cancelled) setCreatureLoading(false)
      }
    }
    const timer = setTimeout(search, 200)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query, activeTab])

  // Hazard search
  useEffect(() => {
    if (activeTab !== 'hazards') return
    let cancelled = false
    const search = async () => {
      setHazardLoading(true)
      try {
        const rows = query.trim()
          ? await searchHazards(query, 50)
          : await getAllHazards()
        if (!cancelled) setHazardResults(rows)
      } finally {
        if (!cancelled) setHazardLoading(false)
      }
    }
    const timer = setTimeout(search, 200)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query, activeTab])

  // Reset tier on query change
  useEffect(() => {
    setSelectedTier('normal')
  }, [query])

  const handleAddCreature = useCallback(
    (row: CreatureRow) => {
      if (onAddCreature) {
        onAddCreature(row, selectedTier)
      } else {
        const creature = toCreature(row)
        addCreatureToDraft({
          creatureId: creature.id,
          name: creature.name,
          level: creature.level,
          tier: selectedTier,
        })
      }
      setSelectedTier('normal')
    },
    [onAddCreature, addCreatureToDraft, selectedTier]
  )

  const handleAddHazard = useCallback(
    (hazard: HazardRow) => {
      if (onAddHazard) {
        onAddHazard(hazard)
      } else {
        addHazardToDraft({
          name: hazard.name,
          level: hazard.level,
          type: hazard.is_complex ? 'complex' : 'simple',
        })
      }
    },
    [onAddHazard, addHazardToDraft]
  )

  const handleTabChange = (tab: SidebarTab) => {
    setActiveTab(tab)
    setQuery('')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab toggle */}
      <div className="p-2 border-b border-border/50 space-y-1.5">
        <div className="flex gap-1">
          <button
            onClick={() => handleTabChange('creatures')}
            className={`flex-1 py-1 text-xs rounded font-semibold transition-colors ${
              activeTab === 'creatures'
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:bg-secondary/50'
            }`}
          >
            Creatures
          </button>
          <button
            onClick={() => handleTabChange('hazards')}
            className={`flex-1 py-1 text-xs rounded font-semibold transition-colors ${
              activeTab === 'hazards'
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:bg-secondary/50'
            }`}
          >
            Hazards
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={activeTab === 'creatures' ? 'Search creatures...' : 'Search hazards...'}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Tier selector — creatures only */}
        {activeTab === 'creatures' && (
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
        )}
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          {/* Creature results */}
          {activeTab === 'creatures' && (
            <>
              {creatureLoading && creatureResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Searching...</p>
              )}
              {!creatureLoading && creatureResults.length === 0 && query.trim() && (
                <p className="text-sm text-muted-foreground text-center py-4">No creatures found</p>
              )}
              {creatureResults.map((row) => {
                const creature = toCreature(row)
                const hpDelta = getHpAdjustment(selectedTier, creature.level)
                const statDelta = getStatAdjustment(selectedTier)
                return (
                  <DraggableCreatureRow key={row.id} row={row} tier={selectedTier}>
                    <CreatureCard
                      creature={creature}
                      compact
                      onAdd={() => handleAddCreature(row)}
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
                  </DraggableCreatureRow>
                )
              })}
            </>
          )}

          {/* Hazard results */}
          {activeTab === 'hazards' && (
            <>
              {hazardLoading && hazardResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Searching...</p>
              )}
              {!hazardLoading && hazardResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {query.trim() ? 'No hazards found' : 'Run sync to import hazards'}
                </p>
              )}
              {hazardResults.map((hazard) => (
                <DraggableHazardRow key={hazard.id} hazard={hazard}>
                  <div
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-secondary/30 hover:bg-secondary/50 group cursor-pointer"
                    onClick={() => handleAddHazard(hazard)}
                  >
                    <LevelBadge level={hazard.level} size="sm" />
                    <span className="flex-1 text-sm font-medium truncate">{hazard.name}</span>
                    {hazard.is_complex ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-900/30 text-orange-400 shrink-0">
                        complex
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/50 text-zinc-400 shrink-0">
                        simple
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0">
                      + add
                    </span>
                  </div>
                </DraggableHazardRow>
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
