import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { SearchInput } from '@/shared/ui/search-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import {
  toCreature,
  extractIwr,
  BestiaryResultRow,
  fetchCreatureStatBlockData,
  type WeakEliteTier,
  type CreatureStatBlockData,
  type CustomCreatureRow,
} from '@/entities/creature'
import { searchCreaturesFiltered, fetchDistinctLibrarySources, getAllCustomCreatures, insertEncounterCombatant } from '@/shared/api'
import type { CreatureRow, LibrarySourceOption } from '@/shared/api'
import { useCombatantStore } from '@/entities/combatant'
import { createCombatantFromCreature } from '@/features/combat-tracker'
import { useShallow } from 'zustand/react/shallow'
import { logErrorWithToast } from '@/shared/lib/error'
import { getHpAdjustment } from '@engine'
import { useDraggable } from '@dnd-kit/core'
import { HazardSearchPanel } from './HazardSearchPanel'
import { CharactersTab } from './CharactersTab'

// custom creatures live in a separate table and have no
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

export function BestiarySearchPanel({ encounterId }: { encounterId?: string }) {
  const { t } = useTranslation('common')
  const [activeTab, setActiveTab] = useState<LeftTab>('bestiary')
  const [query, setQuery] = useState('')
  const [creatureType, setCreatureType] = useState('__all__')
  const [results, setResults] = useState<CreatureRow[]>([])
  const [loading, setLoading] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [selectedTier, setSelectedTier] = useState<WeakEliteTier>('normal')
  // library source filter. `null` = All sources (default).
  // Otherwise a token returned by fetchDistinctLibrarySources — either the
  // `__iconics__` sentinel or an adventure slug.
  const [sourceFilter, setSourceFilter] = useState<string | null>(null)
  const [librarySources, setLibrarySources] = useState<LibrarySourceOption[]>([])

  // custom creatures resolved to CreatureRow shape once so
  // the same CreatureCard + drag/add pipeline works uniformly. Only shown when
  // `sourceFilter === null` (All) — source chips filter Paizo-library scope
  // and customs don't belong to any such scope.
  const [customRows, setCustomRows] = useState<CreatureRow[]>([])

  const tiers = useMemo<{ value: WeakEliteTier; label: string }[]>(() => [
    { value: 'weak', label: t('bestiarySearch.tierWeak') },
    { value: 'normal', label: t('bestiarySearch.tierNormal') },
    { value: 'elite', label: t('bestiarySearch.tierElite') },
  ], [t])

  const tabs = useMemo<{ value: LeftTab; label: string }[]>(() => [
    { value: 'bestiary', label: t('bestiarySearch.tabBestiary') },
    { value: 'hazards', label: t('bestiarySearch.tabHazards') },
    { value: 'characters', label: t('bestiarySearch.tabCharacters') },
  ], [t])

  const combatants = useCombatantStore(useShallow((s) => s.combatants))
  const addCombatant = useCombatantStore((s) => s.addCombatant)

  // load the list of Paizo-library chips once — the set only changes
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

  // eager-fetch custom creatures and resolve each to a
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
    async (row: CreatureRow) => {
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
        selectedTier,
        creature.fort,
      )
      combatant.maxHp = adjustedHp
      combatant.iwrImmunities = iwr.immunities
      combatant.iwrWeaknesses = iwr.weaknesses
      combatant.iwrResistances = iwr.resistances
      // Insert into encounter_combatants before addCombatant triggers auto-save
      // to prevent FK constraint failure when conditions are later applied.
      if (encounterId) {
        const sortOrder = combatants.length
        try {
          await insertEncounterCombatant(encounterId, {
            id: combatant.id,
            encounterId,
            creatureRef: combatant.creatureRef,
            displayName: combatant.displayName,
            initiative: combatant.initiative,
            hp: combatant.hp,
            maxHp: combatant.maxHp,
            tempHp: combatant.tempHp,
            isNPC: true,
            weakEliteTier: combatant.weakEliteTier ?? 'normal',
            creatureLevel: combatant.level ?? 0,
            sortOrder,
            isHazard: false,
            hazardRef: null,
          }, sortOrder)
        } catch (err) {
          logErrorWithToast('bestiary-add-insert')(err)
          return
        }
      }
      addCombatant(combatant)
      setSelectedTier('normal')
    },
    [combatants, addCombatant, selectedTier, encounterId]
  )

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
          <Collapsible
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            className="shrink-0 border-b border-border/50"
          >
            <CollapsibleTrigger className="flex h-8 w-full items-center justify-between px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary/30 hover:text-foreground">
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {t('bestiarySearch.searchFilters')}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-2 space-y-1.5">
            {/* Search input */}
            <SearchInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('bestiarySearch.searchBestiaryPlaceholder')}
              className="h-8 text-sm"
            />
            {/* Creature type filter */}
            <Select value={creatureType} onValueChange={setCreatureType}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder={t('bestiarySearch.allTypes')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t('bestiarySearch.allTypes')}</SelectItem>
                {CREATURE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Tier chips */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">{t('bestiarySearch.tierLabel')}</span>
              {tiers.map((tier) => (
                <button
                  key={tier.value}
                  onClick={() => setSelectedTier(tier.value)}
                  className={`px-2 py-0.5 text-xs rounded transition-colors ${
                    selectedTier === tier.value
                      ? tier.value === 'elite'
                        ? 'bg-primary text-primary-foreground'
                        : tier.value === 'weak'
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-secondary text-secondary-foreground'
                      : 'text-muted-foreground hover:bg-secondary/50'
                  }`}
                >
                  {tier.label}
                </button>
              ))}
            </div>
            {/* Paizo library scope.
                Previously a horizontally-scrolling chip row — the scroll
                was ugly on narrow sidebars. Replaced with a shadcn Select
                dropdown that uses the same values ('__all__' sentinel +
                LibrarySourceOption.value tokens). */}
            {librarySources.length > 0 && (
              <Select
                value={sourceFilter ?? '__all__'}
                onValueChange={(v) => setSourceFilter(v === '__all__' ? null : v)}
              >
                <SelectTrigger className="h-7 text-xs" aria-label={t('bestiarySearch.sourceLibraryFilterAriaLabel')}>
                  <SelectValue placeholder={t('bestiarySearch.allSources')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t('bestiarySearch.allSources')}</SelectItem>
                  {librarySources.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
              </div>
            </CollapsibleContent>
          </Collapsible>
          {/* Results */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-2 space-y-1.5">
              {loading && results.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">{t('bestiarySearch.searching')}</p>
              )}
              {!loading && results.length === 0 && customFiltered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {query.trim()
                    ? t('bestiarySearch.noCreaturesFoundQuery', { query })
                    : t('bestiarySearch.noCreaturesFound')}
                </p>
              )}
              {/* Custom creatures rendered first with a gold
                  accent + "custom" pill so they stand out. Same pipeline as
                  bestiary entries. */}
              {customFiltered.map((row) => (
                <DraggableBestiaryRow key={`custom-${row.id}`} row={row} tier={selectedTier}>
                  <BestiaryResultRow
                    row={row}
                    tier={selectedTier}
                    onAdd={() => handleAdd(row)}
                    isCustom
                  />
                </DraggableBestiaryRow>
              ))}
              {results.map((row) => (
                <DraggableBestiaryRow key={row.id} row={row} tier={selectedTier}>
                  <BestiaryResultRow
                    row={row}
                    tier={selectedTier}
                    onAdd={() => handleAdd(row)}
                  />
                </DraggableBestiaryRow>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
