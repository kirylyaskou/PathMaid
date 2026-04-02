import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import {
  Swords, BookOpen, Zap, Package, ChevronRight,
  Users, Activity, Skull, AlertTriangle
} from 'lucide-react'
import { useCombatTrackerStore } from '@/features/combat-tracker'
import { useCombatantStore } from '@/entities/combatant'
import { useConditionStore } from '@/entities/condition'
import { useEncounterStore } from '@/entities/encounter'
import { PATHS } from '@/shared/routes'
import { getCreatureCount, getSpellCount, getItemCount, getHazardCount } from '@/shared/api'
import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import type { Combatant } from '@/entities/combatant'
import type { Encounter } from '@/entities/encounter'
import type { ActiveCondition } from '@/entities/condition'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DbStats {
  creatures: number
  spells: number
  items: number
  hazards: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)
}

function hpPercent(hp: number, maxHp: number): number {
  if (maxHp <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((hp / maxHp) * 100)))
}

function hpColor(pct: number): string {
  if (pct > 50) return 'bg-green-600'
  if (pct > 25) return 'bg-amber-500'
  return 'bg-red-600'
}

// ─── ActiveCombatCard ─────────────────────────────────────────────────────────

interface ActiveCombatCardProps {
  isRunning: boolean
  round: number
  activeCombatantId: string | null
  combatants: Combatant[]
  activeConditions: ActiveCondition[]
  onNavigate: () => void
}

function ActiveCombatCard({
  isRunning,
  round,
  activeCombatantId,
  combatants,
  activeConditions,
  onNavigate,
}: ActiveCombatCardProps) {
  const condCountById = new Map<string, number>()
  for (const c of activeConditions) {
    condCountById.set(c.combatantId, (condCountById.get(c.combatantId) ?? 0) + 1)
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Active Combat</span>
          {isRunning ? (
            <Badge variant="outline" className="text-xs text-green-400 border-green-700/50 bg-green-900/20">
              Running
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Inactive
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-foreground gap-1"
          onClick={onNavigate}
        >
          Go to Combat
          <ChevronRight className="w-3 h-3" />
        </Button>
      </div>

      {isRunning && combatants.length > 0 ? (
        <div className="p-4">
          <div className="flex items-center gap-4 mb-3">
            <span className="text-xs text-muted-foreground">
              <span className="text-foreground font-medium">Round {round}</span>
              {' · '}
              {combatants.length} combatant{combatants.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {combatants.map((c) => {
              const pct = hpPercent(c.hp, c.maxHp)
              const condCount = condCountById.get(c.id) ?? 0
              const isActive = c.id === activeCombatantId
              return (
                <div
                  key={c.id}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm',
                    isActive ? 'bg-primary/10 border border-primary/30' : 'bg-muted/30'
                  )}
                >
                  <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', isActive ? 'bg-primary' : 'bg-transparent')} />
                  <span className={cn('w-40 truncate', isActive ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                    {c.displayName}
                  </span>
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-32">
                      <div
                        className={cn('h-full rounded-full transition-all', hpColor(pct))}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {c.hp}/{c.maxHp}
                    </span>
                  </div>
                  {c.tempHp > 0 && (
                    <span className="text-xs text-blue-400 shrink-0">+{c.tempHp}</span>
                  )}
                  {condCount > 0 && (
                    <span className="text-xs text-amber-400 shrink-0">
                      {condCount} cond.
                    </span>
                  )}
                  {c.hp === 0 && (
                    <Skull className="w-3 h-3 text-red-500 shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
          <Activity className="w-8 h-8 opacity-30" />
          <p className="text-sm">No active combat</p>
          <Button variant="outline" size="sm" className="mt-1 text-xs" onClick={onNavigate}>
            Open Combat Tracker
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── EncountersCard ───────────────────────────────────────────────────────────

interface EncountersCardProps {
  encounters: Encounter[]
  onNavigate: () => void
}

function EncountersCard({ encounters, onNavigate }: EncountersCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Saved Encounters</span>
          {encounters.length > 0 && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {encounters.length}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-foreground gap-1"
          onClick={onNavigate}
        >
          Open Encounters
          <ChevronRight className="w-3 h-3" />
        </Button>
      </div>

      {encounters.length > 0 ? (
        <div className="divide-y divide-border">
          {encounters.map((enc) => (
            <div key={enc.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground truncate">{enc.name}</span>
                  {enc.isRunning && (
                    <Badge variant="outline" className="text-xs text-green-400 border-green-700/50 bg-green-900/20 shrink-0">
                      Running
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  Party Lvl {enc.partyLevel} · {enc.partySize} players
                  {enc.round > 0 && ` · Round ${enc.round}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
          <AlertTriangle className="w-8 h-8 opacity-30" />
          <p className="text-sm">No saved encounters</p>
          <Button variant="outline" size="sm" className="mt-1 text-xs" onClick={onNavigate}>
            Create Encounter
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── CompendiumStatsCard ──────────────────────────────────────────────────────

interface CompendiumStatsCardProps {
  stats: DbStats | null
}

const STAT_ITEMS = [
  { key: 'creatures' as const, label: 'Creatures', icon: Skull, color: 'text-red-400' },
  { key: 'spells'   as const, label: 'Spells',    icon: Zap,   color: 'text-purple-400' },
  { key: 'items'    as const, label: 'Items',      icon: Package, color: 'text-amber-400' },
  { key: 'hazards'  as const, label: 'Hazards',    icon: AlertTriangle, color: 'text-orange-400' },
]

function CompendiumStatsCard({ stats }: CompendiumStatsCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <BookOpen className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">Compendium</span>
      </div>
      <div className="p-4 flex flex-col gap-3">
        {STAT_ITEMS.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="flex items-center gap-3">
            <Icon className={cn('w-4 h-4 shrink-0', color)} />
            <span className="flex-1 text-sm text-muted-foreground">{label}</span>
            <span className="text-sm font-medium text-foreground tabular-nums">
              {stats ? formatCount(stats[key]) : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── DashboardPage ────────────────────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate()

  const { isRunning, round, activeCombatantId } = useCombatTrackerStore(
    useShallow((s) => ({
      isRunning: s.isRunning,
      round: s.round,
      activeCombatantId: s.activeCombatantId,
    }))
  )
  const combatants = useCombatantStore(useShallow((s) => s.combatants))
  const activeConditions = useConditionStore(useShallow((s) => s.activeConditions))

  const { encounters, loadEncounters } = useEncounterStore(
    useShallow((s) => ({ encounters: s.encounters, loadEncounters: s.loadEncounters }))
  )

  const [stats, setStats] = useState<DbStats | null>(null)

  useEffect(() => {
    loadEncounters()
    Promise.all([
      getCreatureCount(),
      getSpellCount(),
      getItemCount(),
      getHazardCount(),
    ]).then(([creatures, spells, items, hazards]) => {
      setStats({ creatures, spells, items, hazards })
    })
  }, [loadEncounters])

  const recentEncounters = [...encounters]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)

  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto">
      <ActiveCombatCard
        isRunning={isRunning}
        round={round}
        activeCombatantId={activeCombatantId}
        combatants={combatants}
        activeConditions={activeConditions}
        onNavigate={() => navigate(PATHS.COMBAT)}
      />
      <div className="grid grid-cols-[1fr_260px] gap-4">
        <EncountersCard
          encounters={recentEncounters}
          onNavigate={() => navigate(PATHS.ENCOUNTERS)}
        />
        <CompendiumStatsCard stats={stats} />
      </div>
    </div>
  )
}
