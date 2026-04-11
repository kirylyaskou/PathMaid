import { useState, useCallback, useEffect } from 'react'
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
import { searchCreaturesFiltered } from '@/shared/api'
import type { CreatureRow } from '@/shared/api'
import { useCombatantStore } from '@/entities/combatant'
import { createCombatantFromCreature } from '@/features/combat-tracker'
import { useShallow } from 'zustand/react/shallow'
import { getHpAdjustment, getStatAdjustment } from '@engine'
import { useDraggable } from '@dnd-kit/core'
import { HazardSearchPanel } from './HazardSearchPanel'
import { CharactersTab } from './CharactersTab'

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

  const combatants = useCombatantStore(useShallow((s) => s.combatants))
  const addCombatant = useCombatantStore((s) => s.addCombatant)

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
  }, [query, creatureType, activeTab])

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
          </div>
          {/* Results */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-2 space-y-1.5">
              {loading && results.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Searching...</p>
              )}
              {!loading && results.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {query.trim() ? `No creatures found for "${query}"` : 'No creatures found'}
                </p>
              )}
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
