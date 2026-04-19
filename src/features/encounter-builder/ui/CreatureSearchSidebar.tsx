import { useState, useEffect, useCallback, useMemo } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { SearchInput } from '@/shared/ui/search-input'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { LevelBadge } from '@/shared/ui/level-badge'
import { CreatureCard, StatBlockModal, toCreature } from '@/entities/creature'
import type { WeakEliteTier } from '@/entities/creature'
import { fetchCreatureStatBlockData } from '@/entities/creature/model/fetchStatBlock'
import type { CreatureStatBlockData } from '@/entities/creature/model/types'
import type { CustomCreatureRow } from '@/entities/creature/model/custom-creature-types'
import { searchCreaturesFiltered, searchHazards, getAllHazards, saveEncounterStagingCombatants, getAllCustomCreatures, fetchDistinctLibrarySources } from '@/shared/api'
import type { CreatureRow, HazardRow, EncounterStagingRow, LibrarySourceOption } from '@/shared/api'
import { useEncounterBuilderStore } from '../model/store'
import { useCombatantStore } from '@/entities/combatant'
import type { NpcCombatant, StagingCombatant } from '@/entities/combatant'
import { getHpAdjustment, getStatAdjustment } from '@engine'
import { logErrorWithToast } from '@/shared/lib/error'

function stagingToRows(encounterId: string, staging: StagingCombatant[]): EncounterStagingRow[] {
  return staging.map((sc, i) => ({
    id: sc.combatant.id,
    encounterId,
    kind: sc.combatant.kind,
    creatureRef: 'creatureRef' in sc.combatant ? (sc.combatant as NpcCombatant).creatureRef : '',
    displayName: sc.combatant.displayName,
    hp: sc.combatant.hp,
    maxHp: sc.combatant.maxHp,
    tempHp: sc.combatant.tempHp,
    creatureLevel: sc.combatant.level ?? 0,
    weakEliteTier: 'normal' as const,
    round: sc.round ?? null,
    sortOrder: i,
  }))
}

type SidebarTab = 'creatures' | 'hazards'

const TIERS: { value: WeakEliteTier; label: string }[] = [
  { value: 'weak', label: 'Weak' },
  { value: 'normal', label: 'Normal' },
  { value: 'elite', label: 'Elite' },
]

interface CreatureSearchSidebarProps {
  onAddCreature?: (row: CreatureRow, tier: WeakEliteTier) => void
  onAddHazard?: (hazard: HazardRow) => void
  encounterId?: string | null
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

// D-25: adapt a loaded custom stat block into the CreatureRow shape the existing
// onAddCreature / handleAddCreature pipeline consumes. Co-located — not exported.
// traits is JSON-stringified (toCreature uses parseJsonArray); raw_json carries the
// full stat block but downstream fetchStatBlockData routes custom- ids through the
// 59-10 Task 1 prefix branch, so raw_json re-parsing never runs for custom rows.
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

export function CreatureSearchSidebar({ onAddCreature, onAddHazard, encounterId }: CreatureSearchSidebarProps = {}) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('creatures')
  const [query, setQuery] = useState('')

  // Creature state
  const [creatureResults, setCreatureResults] = useState<CreatureRow[]>([])
  const [creatureLoading, setCreatureLoading] = useState(false)
  const [selectedTier, setSelectedTier] = useState<WeakEliteTier>('normal')

  // D-25: custom creatures resolved to CreatureRow shape once on mount so the
  // same <CreatureCard> pipeline (compact, onAdd, onAddToStaging, tier math,
  // drag-to-drop) renders them uniformly with bestiary entries.
  const [customRows, setCustomRows] = useState<CreatureRow[]>([])

  // Hazard state
  const [hazardResults, setHazardResults] = useState<HazardRow[]>([])
  const [hazardLoading, setHazardLoading] = useState(false)

  // FEAT-12: clicking a creature card opens its stat block for preview (no add)
  const [statBlockCreatureId, setStatBlockCreatureId] = useState<string | null>(null)

  // 70-04: Paizo library scope filter — parity with BestiarySearchPanel.
  const [sourceFilter, setSourceFilter] = useState<string | null>(null)
  const [librarySources, setLibrarySources] = useState<LibrarySourceOption[]>([])

  const addCreatureToDraft = useEncounterBuilderStore((s) => s.addCreatureToDraft)
  const addHazardToDraft = useEncounterBuilderStore((s) => s.addHazardToDraft)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const opts = await fetchDistinctLibrarySources()
        if (!cancelled) setLibrarySources(opts)
      } catch {
        // Silent — absence of iconic/pregens must not break the sidebar.
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Creature search
  useEffect(() => {
    if (activeTab !== 'creatures') return
    let cancelled = false
    const search = async () => {
      setCreatureLoading(true)
      try {
        const rows = await searchCreaturesFiltered(
          {
            query: query.trim() || undefined,
            sourceAdventure: sourceFilter,
          },
          50
        )
        if (!cancelled) setCreatureResults(rows)
      } finally {
        if (!cancelled) setCreatureLoading(false)
      }
    }
    const timer = setTimeout(search, 200)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query, activeTab, sourceFilter])

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

  // D-25: load custom creatures and resolve each to a CreatureRow so
  // <CreatureCard> can render them identically to bestiary entries.
  // Eager-fetch is cheap in practice (a user has tens of custom creatures
  // at most). Optimization into a single multi-id query is deferred until
  // observed slowness.
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
          setCustomRows(
            resolved.filter((r): r is CreatureRow => r !== null)
          )
        }
      } catch {
        // Silent — absence of custom creatures must not break bestiary sidebar.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Reset tier on query change
  useEffect(() => {
    setSelectedTier('normal')
  }, [query])

  // D-25: filter custom creatures by name; cap at 20 for row-density parity.
  const customFiltered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return customRows.slice(0, 20)
    return customRows.filter((r) => r.name.toLowerCase().includes(q)).slice(0, 20)
  }, [customRows, query])

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

  // D-25: custom creatures go through the SAME handleAddCreature pipeline
  // as bestiary entries — no separate handler needed now that customRows are
  // pre-resolved to CreatureRow shape at mount time.

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
        <SearchInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={activeTab === 'creatures' ? 'Search creatures...' : 'Search hazards...'}
          className="h-8 text-sm"
        />

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
        {/* 70-04: Paizo library scope — parity with BestiarySearchPanel. */}
        {activeTab === 'creatures' && librarySources.length > 0 && (
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
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          {/* Creature results */}
          {activeTab === 'creatures' && (
            <>
              {creatureLoading && creatureResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Searching...</p>
              )}
              {!creatureLoading && creatureResults.length === 0 && customFiltered.length === 0 && query.trim() && (
                <p className="text-sm text-muted-foreground text-center py-4">No creatures found</p>
              )}
              {/* D-25: custom creatures — same CreatureCard pipeline as bestiary,
                  visually marked with a gold left-border accent + absolute "custom"
                  chip overlay so users can distinguish them at a glance. */}
              {customFiltered.map((row) => {
                const creature = toCreature(row)
                const hpDelta = getHpAdjustment(selectedTier, creature.level)
                const statDelta = getStatAdjustment(selectedTier)
                return (
                  <DraggableCreatureRow key={`custom-${row.id}`} row={row} tier={selectedTier}>
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
                        onAdd={() => handleAddCreature(row)}
                        onAddToStaging={encounterId ? () => {
                          const combatant: NpcCombatant = {
                            id: crypto.randomUUID(),
                            kind: 'npc',
                            creatureRef: row.id,
                            displayName: creature.name,
                            initiative: 0,
                            hp: Math.max(1, creature.hp + getHpAdjustment(selectedTier, creature.level)),
                            maxHp: Math.max(1, creature.hp + getHpAdjustment(selectedTier, creature.level)),
                            tempHp: 0,
                            level: creature.level,
                          }
                          useCombatantStore.getState().addStagingCombatant(combatant)
                          const staging = useCombatantStore.getState().stagingCombatants
                          saveEncounterStagingCombatants(encounterId, stagingToRows(encounterId, staging))
                            .catch(logErrorWithToast('staging-save'))
                        } : undefined}
                        onClick={() => setStatBlockCreatureId(row.id)}
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
                  </DraggableCreatureRow>
                )
              })}
              {creatureResults.map((row) => {
                const creature = toCreature(row)
                const hpDelta = getHpAdjustment(selectedTier, creature.level)
                const statDelta = getStatAdjustment(selectedTier)
                return (
                  <DraggableCreatureRow key={row.id} row={row} tier={selectedTier}>
                    <div>
                      <CreatureCard
                        creature={creature}
                        compact
                        onAdd={() => handleAddCreature(row)}
                        onAddToStaging={encounterId ? () => {
                          const combatant: NpcCombatant = {
                            id: crypto.randomUUID(),
                            kind: 'npc',
                            creatureRef: row.id,
                            displayName: creature.name,
                            initiative: 0,
                            hp: Math.max(1, creature.hp + getHpAdjustment(selectedTier, creature.level)),
                            maxHp: Math.max(1, creature.hp + getHpAdjustment(selectedTier, creature.level)),
                            tempHp: 0,
                            level: creature.level,
                          }
                          useCombatantStore.getState().addStagingCombatant(combatant)
                          const staging = useCombatantStore.getState().stagingCombatants
                          saveEncounterStagingCombatants(encounterId, stagingToRows(encounterId, staging))
                            .catch(logErrorWithToast('staging-save'))
                        } : undefined}
                        onClick={() => setStatBlockCreatureId(row.id)}
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

      {/* Stat block preview modal — opens on creature card click (no add) */}
      <StatBlockModal
        creatureId={statBlockCreatureId}
        open={statBlockCreatureId !== null}
        onOpenChange={(open) => { if (!open) setStatBlockCreatureId(null) }}
      />
    </div>
  )
}
