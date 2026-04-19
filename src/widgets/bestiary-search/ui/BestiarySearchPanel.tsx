import { useState, useCallback, useEffect, useMemo } from 'react'
import { SearchInput } from '@/shared/ui/search-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { CreatureCard, toCreature, extractIwr } from '@/entities/creature'
import type { WeakEliteTier } from '@/entities/creature'
import { fetchCreatureStatBlockData } from '@/entities/creature/model/fetchStatBlock'
import type { CreatureStatBlockData } from '@/entities/creature/model/types'
import type { CustomCreatureRow } from '@/entities/creature/model/custom-creature-types'
import { searchCreaturesFiltered, fetchDistinctLibrarySources, getAllCustomCreatures } from '@/shared/api'
import type { CreatureRow, LibrarySourceOption } from '@/shared/api'
import { useCombatantStore } from '@/entities/combatant'
import { createCombatantFromCreature } from '@/features/combat-tracker'
import { useShallow } from 'zustand/react/shallow'
import { getHpAdjustment, getStatAdjustment } from '@engine'
import { useDraggable } from '@dnd-kit/core'
import { HazardSearchPanel } from './HazardSearchPanel'
import { CharactersTab } from './CharactersTab'

// v1.4.1 UAT BUG-1: custom creatures live in a separate table and have no
// source_pack, so the bestiary search query misses them entirely. Adapt the
// loaded stat block into the CreatureRow shape the existing add-to-combat
// pipeline consumes — same approach as CreatureSearchSidebar.
function customToCreatureRow(custom: CustomCreatureRow, stat: CreatureStatBlockData): CreatureRow {
  return {
    id: custom.id,
    name: stat.name,
    type: stat.type,
    level: stat.level,
    hp: stat.hp,
    ac: stat.ac,
    fort: stat.fort,
    ref: stat.ref,
    will: stat.will,
    perception: stat.perception,
    traits: JSON.stringify(stat.traits ?? []),
    rarity: stat.rarity,
    size: stat.size,
    source_pack: null,
    source_name: null,
    source_adventure: null,
    raw_json: JSON.stringify(stat),
  }
}

type LeftTab = 'bestiary' | 'hazards' | 'characters'

const TIERS: { value: WeakEliteTier; label: string }[] = [
  { value: 'weak', label: 'Weak' },
  { value: 'normal', label: 'Normal' },
  { value: 'elite', label: 'Elite' },
]

const CREATURE_TYPES = [
  'aberration', 'animal', 'astral', 'beast', 'celestial', 'construct',
  'dragon', 'dream', 'elemental', 'ethereal', 'fey', 'fiend', 'fungus',
  'giant', 'humanoid', 'monitor', 'ooze', 'petitioner', 'plant', 'undead',
] as const

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

export function BestiarySearchPanel() {
  const [activeTab, setActiveTab] = useState<LeftTab>('bestiary')
  const [query, setQuery] = useState('')
  const [creatureType, setCreatureType] = useState('__all__')
  const [results, setResults] = useState<CreatureRow[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTier, setSelectedTier] = useState<WeakEliteTier>('normal')
  // 70-04: library source filter. `null` = All sources (default).
  // Otherwise a token returned by fetchDistinctLibrarySources — either the
  // `__iconics__` sentinel or an adventure slug.
  const [sourceFilter, setSourceFilter] = useState<string | null>(null)
  const [librarySources, setLibrarySources] = useState<LibrarySourceOption[]>([])

  // v1.4.1 UAT BUG-1: custom creatures resolved to CreatureRow shape once so
  // the same CreatureCard + drag/add pipeline works uniformly. Only shown when
  // `sourceFilter === null` (All) — source chips filter Paizo-library scope
  // and customs don't belong to any such scope.
  const [customRows, setCustomRows] = useState<CreatureRow[]>([])

  const combatants = useCombatantStore(useShallow((s) => s.combatants))
  const addCombatant = useCombatantStore((s) => s.addCombatant)

  // 70-04: load the list of Paizo-library chips once — the set only changes
  // on sync and regenerating it per-search would be wasteful.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const opts = await fetchDistinctLibrarySources()
        if (!cancelled) setLibrarySources(opts)
      } catch {
        // Silent — absence of iconic/pregens must not break the bestiary.
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (activeTab !== 'bestiary') return
    let cancelled = false
    const search = async () => {
      setLoading(true)
      try {
        const rows = await searchCreaturesFiltered(
          {
            query: query.trim() || undefined,
            traits: creatureType !== '__all__' ? [creatureType] : undefined,
            sourceAdventure: sourceFilter,
          },
          50
        )
        if (!cancelled) setResults(rows)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    const timer = setTimeout(search, 200)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query, creatureType, activeTab, sourceFilter])

  // v1.4.1 UAT BUG-1: eager-fetch custom creatures and resolve each to a
  // CreatureRow. Cheap in practice (tens of entries at most).
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const list = await getAllCustomCreatures()
        if (cancelled) return
        const resolved = await Promise.all(
          list.map(async (c) => {
            try {
              const stat = await fetchCreatureStatBlockData(c.id)
              return stat ? customToCreatureRow(c, stat) : null
            } catch {
              return null
            }
          })
        )
        if (!cancelled) {
          setCustomRows(resolved.filter((r): r is CreatureRow => r !== null))
        }
      } catch {
        // Silent — absence of custom creatures must not break bestiary search.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Filter customs by query + suppress when a Paizo source chip is active.
  const customFiltered = useMemo(() => {
    if (sourceFilter !== null) return []
    const q = query.trim().toLowerCase()
    if (!q) return customRows.slice(0, 20)
    return customRows.filter((r) => r.name.toLowerCase().includes(q)).slice(0, 20)
  }, [customRows, query, sourceFilter])

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
        combatants,
        creature.level,
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

  const tabs: { value: LeftTab; label: string }[] = [
    { value: 'bestiary', label: 'Bestiary' },
    { value: 'hazards', label: 'Hazards' },
    { value: 'characters', label: 'Characters' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Tab toggle row */}
      <div className="flex gap-1 p-1 border-b border-border/50 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              activeTab === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Hazards tab */}
      {activeTab === 'hazards' && <HazardSearchPanel />}

      {/* Characters tab */}
      {activeTab === 'characters' && <CharactersTab />}

      {/* Bestiary tab */}
      {activeTab === 'bestiary' && (
        <>
          <div className="p-2 border-b border-border/50 space-y-1.5 shrink-0">
            {/* Search input */}
            <SearchInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search bestiary..."
              className="h-8 text-sm"
            />
            {/* Creature type filter */}
            <Select value={creatureType} onValueChange={setCreatureType}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All types</SelectItem>
                {CREATURE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Tier chips */}
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
            {/* 70-04: Paizo library scope — horizontally scrolling chip row.
                Hidden when no iconic/pregen rows were synced (empty array). */}
            {librarySources.length > 0 && (
              <div
                role="tablist"
                aria-label="Source library filter"
                className="flex items-center gap-1.5 overflow-x-auto"
              >
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1 shrink-0">Source</span>
                <button
                  role="tab"
                  aria-selected={sourceFilter === null}
                  onClick={() => setSourceFilter(null)}
                  className={`px-2 py-0.5 text-xs rounded transition-colors shrink-0 ${
                    sourceFilter === null
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent/30'
                  }`}
                >
                  All
                </button>
                {librarySources.map((opt) => (
                  <button
                    key={opt.value}
                    role="tab"
                    aria-selected={sourceFilter === opt.value}
                    onClick={() => setSourceFilter(opt.value)}
                    className={`px-2 py-0.5 text-xs rounded transition-colors shrink-0 ${
                      sourceFilter === opt.value
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-accent/30'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Results */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-2 space-y-1.5">
              {loading && results.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Searching...</p>
              )}
              {!loading && results.length === 0 && customFiltered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {query.trim() ? `No creatures found for "${query}"` : 'No creatures found'}
                </p>
              )}
              {/* v1.4.1 UAT BUG-1: custom creatures rendered first with a gold
                  accent + "custom" pill so they stand out. Same pipeline as
                  bestiary entries. */}
              {customFiltered.map((row) => {
                const creature = toCreature(row)
                const hpDelta = getHpAdjustment(selectedTier, creature.level)
                const statDelta = getStatAdjustment(selectedTier)
                return (
                  <DraggableBestiaryRow key={`custom-${row.id}`} row={row} tier={selectedTier}>
                    <div className="relative">
                      <span
                        className="absolute top-1.5 right-1.5 z-10 text-[10px] px-1.5 py-0.5 rounded bg-pf-gold/15 text-pf-gold border border-pf-gold/30 pointer-events-none uppercase tracking-wider"
                      >
                        custom
                      </span>
                      <CreatureCard
                        creature={creature}
                        compact
                        className="border-l-2 border-l-pf-gold"
                        onAdd={() => handleAdd(row)}
                      />
                    </div>
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
              {results.map((row) => {
                const creature = toCreature(row)
                const hpDelta = getHpAdjustment(selectedTier, creature.level)
                const statDelta = getStatAdjustment(selectedTier)
                return (
                  <DraggableBestiaryRow key={row.id} row={row} tier={selectedTier}>
                    <CreatureCard creature={creature} compact onAdd={() => handleAdd(row)} />
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
          </div>
        </>
      )}
    </div>
  )
}
