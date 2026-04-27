import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useDraggable } from '@dnd-kit/core'
import { SearchInput } from '@/shared/ui/search-input'
import { ScrollArea } from '@/shared/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { LevelBadge } from '@/shared/ui/level-badge'
import { StatBlockModal, toCreature, BestiaryResultRow } from '@/entities/creature'
import type { WeakEliteTier } from '@/entities/creature'
import { fetchCreatureStatBlockData } from '@/entities/creature/model/fetchStatBlock'
import type { CreatureStatBlockData } from '@/entities/creature/model/types'
import type { CustomCreatureRow } from '@/entities/creature/model/custom-creature-types'
import { searchCreaturesFiltered, searchHazards, getAllHazards, saveEncounterStagingCombatants, getAllCustomCreatures, fetchDistinctLibrarySources } from '@/shared/api'
import type { CreatureRow, HazardRow, EncounterStagingRow, LibrarySourceOption } from '@/shared/api'
import { useEncounterBuilderStore } from '../model/store'
import { useCombatantStore } from '@/entities/combatant'
import type { NpcCombatant, StagingCombatant } from '@/entities/combatant'
import { getHpAdjustment } from '@engine'
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

// Adapt a loaded custom stat block into the CreatureRow shape the existing
// handleAddCreature pipeline consumes. Co-located — not exported.
// traits is JSON-stringified (toCreature uses parseJsonArray); raw_json carries
// the full stat block but fetchStatBlockData routes custom- ids through the
// prefix branch, so raw_json re-parsing never runs for custom rows.
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
  const { t } = useTranslation('common')
  const [activeTab, setActiveTab] = useState<SidebarTab>('creatures')
  const [query, setQuery] = useState('')

  // Creature state
  const [creatureResults, setCreatureResults] = useState<CreatureRow[]>([])
  const [creatureLoading, setCreatureLoading] = useState(false)
  const [selectedTier, setSelectedTier] = useState<WeakEliteTier>('normal')

  // Custom creatures resolved to CreatureRow shape once on mount so the same
  // <CreatureCard> pipeline renders them uniformly with bestiary entries.
  const [customRows, setCustomRows] = useState<CreatureRow[]>([])

  // Hazard state
  const [hazardResults, setHazardResults] = useState<HazardRow[]>([])
  const [hazardLoading, setHazardLoading] = useState(false)

  // Clicking a creature card opens its stat block for preview (no add).
  const [statBlockCreatureId, setStatBlockCreatureId] = useState<string | null>(null)

  // Paizo library scope filter — parity with BestiarySearchPanel.
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

  // Load custom creatures and resolve each to a CreatureRow so CreatureCard
  // renders them identically to bestiary entries. Eager-fetch is cheap in
  // practice (tens of custom creatures at most); collapsing this to a single
  // multi-id query is deferred until observed slowness.
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

  const tiers = useMemo(() => [
    { value: 'weak' as WeakEliteTier, label: t('encounterBuilder.tierWeak') },
    { value: 'normal' as WeakEliteTier, label: t('encounterBuilder.tierNormal') },
    { value: 'elite' as WeakEliteTier, label: t('encounterBuilder.tierElite') },
  ], [t])

  // Reset tier on query change
  useEffect(() => {
    setSelectedTier('normal')
  }, [query])

  // Filter custom creatures by name; cap at 20 for row-density parity.
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

  const handleAddToStaging = useCallback(
    (row: CreatureRow) => {
      if (!encounterId) return
      const creature = toCreature(row)
      const adjustedHp = Math.max(1, creature.hp + getHpAdjustment(selectedTier, creature.level))
      const combatant: NpcCombatant = {
        id: crypto.randomUUID(),
        kind: 'npc',
        creatureRef: row.id,
        displayName: creature.name,
        initiative: 0,
        hp: adjustedHp,
        maxHp: adjustedHp,
        tempHp: 0,
        level: creature.level,
      }
      useCombatantStore.getState().addStagingCombatant(combatant)
      const staging = useCombatantStore.getState().stagingCombatants
      saveEncounterStagingCombatants(encounterId, stagingToRows(encounterId, staging))
        .catch(logErrorWithToast('staging-save'))
    },
    [encounterId, selectedTier]
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
            {t('encounterBuilder.tabCreatures')}
          </button>
          <button
            onClick={() => handleTabChange('hazards')}
            className={`flex-1 py-1 text-xs rounded font-semibold transition-colors ${
              activeTab === 'hazards'
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:bg-secondary/50'
            }`}
          >
            {t('encounterBuilder.tabHazards')}
          </button>
        </div>

        {/* Search input */}
        <SearchInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={activeTab === 'creatures' ? t('encounterBuilder.searchCreaturesPlaceholder') : t('encounterBuilder.searchHazardsPlaceholder')}
          className="h-8 text-sm"
        />

        {/* Tier selector — creatures only */}
        {activeTab === 'creatures' && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">{t('encounterBuilder.tierLabel')}</span>
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
        )}
        {/* Paizo library scope — shadcn Select dropdown (replaces horizontal chip row). */}
        {activeTab === 'creatures' && librarySources.length > 0 && (
          <Select
            value={sourceFilter ?? '__all__'}
            onValueChange={(v) => setSourceFilter(v === '__all__' ? null : v)}
          >
            <SelectTrigger className="h-7 text-xs" aria-label={t('encounterBuilder.sourceLibraryFilterAriaLabel')}>
              <SelectValue placeholder={t('encounterBuilder.allSources')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t('encounterBuilder.allSources')}</SelectItem>
              {librarySources.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          {/* Creature results */}
          {activeTab === 'creatures' && (
            <>
              {creatureLoading && creatureResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">{t('encounterBuilder.searching')}</p>
              )}
              {!creatureLoading && creatureResults.length === 0 && customFiltered.length === 0 && query.trim() && (
                <p className="text-sm text-muted-foreground text-center py-4">{t('encounterBuilder.noCreaturesFound')}</p>
              )}
              {/* Custom creatures — gold left-border accent + "custom" chip overlay
                  distinguishes them from bestiary entries at a glance. */}
              {customFiltered.map((row) => (
                <DraggableCreatureRow key={`custom-${row.id}`} row={row} tier={selectedTier}>
                  <BestiaryResultRow
                    row={row}
                    tier={selectedTier}
                    onAdd={() => handleAddCreature(row)}
                    onAddToStaging={encounterId ? () => handleAddToStaging(row) : undefined}
                    onClick={() => setStatBlockCreatureId(row.id)}
                    isCustom
                  />
                </DraggableCreatureRow>
              ))}
              {creatureResults.map((row) => (
                <DraggableCreatureRow key={row.id} row={row} tier={selectedTier}>
                  <BestiaryResultRow
                    row={row}
                    tier={selectedTier}
                    onAdd={() => handleAddCreature(row)}
                    onAddToStaging={encounterId ? () => handleAddToStaging(row) : undefined}
                    onClick={() => setStatBlockCreatureId(row.id)}
                  />
                </DraggableCreatureRow>
              ))}
            </>
          )}

          {/* Hazard results */}
          {activeTab === 'hazards' && (
            <>
              {hazardLoading && hazardResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">{t('encounterBuilder.searching')}</p>
              )}
              {!hazardLoading && hazardResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {query.trim() ? t('encounterBuilder.noHazardsFound') : t('encounterBuilder.runSyncToImport')}
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
                        {t('encounterBuilder.chipComplex')}
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/50 text-zinc-400 shrink-0">
                        {t('encounterBuilder.chipSimple')}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0">
                      {t('encounterBuilder.addChip')}
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
