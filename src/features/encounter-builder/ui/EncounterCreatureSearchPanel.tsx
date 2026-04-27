import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { SearchInput } from '@/shared/ui/search-input'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { searchCreaturesFiltered, saveEncounterCombatants } from '@/shared/api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import type { CreatureRow, EncounterCombatantRow } from '@/shared/api'
import { useEncounterStore } from '@/entities/encounter'
import type { EncounterCombatant } from '@/entities/encounter'
import { getHpAdjustment } from '@engine'

const CREATURE_TYPES = [
  'aberration', 'animal', 'astral', 'beast', 'celestial', 'construct',
  'dragon', 'dream', 'elemental', 'ethereal', 'fey', 'fiend', 'fungus',
  'giant', 'humanoid', 'monitor', 'ooze', 'petitioner', 'plant', 'undead',
] as const

interface Props {
  encounterId: string
  currentCombatants: EncounterCombatant[]
}

type Tier = 'normal' | 'weak' | 'elite'

export function EncounterCreatureSearchPanel({ encounterId, currentCombatants }: Props) {
  const { t } = useTranslation('common')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CreatureRow[]>([])
  const [loading, setLoading] = useState(false)
  const [creatureType, setCreatureType] = useState('__all__')
  const setEncounterCombatants = useEncounterStore((s) => s.setEncounterCombatants)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
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
    const timer = setTimeout(run, 200)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query, creatureType])

  async function handleAdd(row: CreatureRow, tier: Tier) {
    const baseLevel = row.level ?? 0
    const baseHp = row.hp ?? 0
    const hpDelta = getHpAdjustment(tier, baseLevel)
    const adjustedHp = Math.max(1, baseHp + hpDelta)

    const newCombatant: EncounterCombatantRow = {
      id: crypto.randomUUID(),
      encounterId,
      creatureRef: row.id,
      displayName: row.name,
      initiative: 0,
      hp: adjustedHp,
      maxHp: adjustedHp,
      tempHp: 0,
      isNPC: true,
      weakEliteTier: tier,
      creatureLevel: baseLevel,
      sortOrder: currentCombatants.length,
      isHazard: false,
      hazardRef: null,
    }

    const updatedRows: EncounterCombatantRow[] = [
      ...currentCombatants.map((c) => ({
        id: c.id,
        encounterId: c.encounterId,
        creatureRef: c.creatureRef,
        displayName: c.displayName,
        initiative: c.initiative,
        hp: c.hp,
        maxHp: c.maxHp,
        tempHp: c.tempHp,
        isNPC: c.isNPC,
        weakEliteTier: c.weakEliteTier,
        creatureLevel: c.creatureLevel,
        sortOrder: c.sortOrder,
        isHazard: c.isHazard ?? false,
        hazardRef: c.hazardRef ?? null,
      })),
      newCombatant,
    ]

    await saveEncounterCombatants(encounterId, updatedRows)

    const updated: EncounterCombatant[] = updatedRows.map((r) => ({
      id: r.id,
      encounterId: r.encounterId,
      creatureRef: r.creatureRef,
      displayName: r.displayName,
      initiative: r.initiative,
      hp: r.hp,
      maxHp: r.maxHp,
      tempHp: r.tempHp,
      isNPC: r.isNPC,
      weakEliteTier: r.weakEliteTier as Tier,
      creatureLevel: r.creatureLevel,
      sortOrder: r.sortOrder,
      isHazard: r.isHazard,
      hazardRef: r.hazardRef,
    }))
    setEncounterCombatants(encounterId, updated)
  }

  return (
    <div className="border-t border-border/50">
      {/* Search input */}
      <div className="px-2 pt-2 pb-1">
        <SearchInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('encounterBuilder.searchCreaturesPlaceholder')}
          className="h-8 text-sm"
        />
      </div>
      {/* Creature type filter */}
      <div className="px-2 pb-1">
        <Select value={creatureType} onValueChange={setCreatureType}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder={t('encounterBuilder.allTypes')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t('encounterBuilder.allTypes')}</SelectItem>
            {CREATURE_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      <ScrollArea className="h-48">
        <div className="px-2 pb-2 space-y-0.5">
          {loading && results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">{t('encounterBuilder.searching')}</p>
          )}
          {!loading && results.length === 0 && query.trim() && (
            <p className="text-sm text-muted-foreground text-center py-4">{t('encounterBuilder.noCreaturesFound')}</p>
          )}
          {results.map((row) => {
            const baseLevel = row.level ?? 0
            return (
              <div key={row.id}>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary/30">
                  <span className="flex-1 text-sm truncate">{row.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">Lv{baseLevel}</span>
                  {/* [W][+][E] button group */}
                  <div className="flex gap-0.5">
                    <button
                      onClick={() => handleAdd(row, 'weak')}
                      className="h-6 px-2 text-[10px] font-medium rounded bg-muted text-muted-foreground hover:bg-muted/80"
                    >
                      W
                    </button>
                    <button
                      onClick={() => handleAdd(row, 'normal')}
                      className="h-6 px-2 text-[10px] font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      +
                    </button>
                    <button
                      onClick={() => handleAdd(row, 'elite')}
                      className="h-6 px-2 text-[10px] font-medium rounded bg-primary/20 text-primary hover:bg-primary/30"
                    >
                      E
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
