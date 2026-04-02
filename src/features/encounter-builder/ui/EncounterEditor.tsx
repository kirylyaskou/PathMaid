import { useState } from 'react'
import { X, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { LevelBadge } from '@/shared/ui/level-badge'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { useEncounterStore } from '@/entities/encounter'
import { saveEncounterCombatants } from '@/shared/api'
import type { EncounterCombatantRow } from '@/shared/api'
import { EncounterCreatureSearchPanel } from './EncounterCreatureSearchPanel'
import { calculateCreatureXP } from '@engine'

interface Props {
  encounterId: string
  partyLevel: number
}

export function EncounterEditor({ encounterId, partyLevel }: Props) {
  const encounter = useEncounterStore((s) => s.encounters.find((e) => e.id === encounterId))
  const setEncounterCombatants = useEncounterStore((s) => s.setEncounterCombatants)
  const [searchOpen, setSearchOpen] = useState(false)

  if (!encounter) return null

  const combatants = encounter.combatants

  async function handleRemove(instanceId: string) {
    const remaining = combatants.filter((c) => c.id !== instanceId)
    const rows: EncounterCombatantRow[] = remaining.map((c, i) => ({
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
      sortOrder: i,
    }))
    await saveEncounterCombatants(encounterId, rows)
    setEncounterCombatants(encounterId, remaining.map((c, i) => ({ ...c, sortOrder: i })))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 shrink-0">
        <p className="text-base font-semibold truncate">{encounter.name}</p>
      </div>

      {/* Creature list */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {combatants.length > 0 && (
            <p className="text-xs text-muted-foreground mb-2">
              {combatants.length} creature{combatants.length !== 1 ? 's' : ''}
            </p>
          )}

          {combatants.length === 0 && !searchOpen && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No creatures added yet.
            </p>
          )}

          {combatants.map((c) => {
            const adjustedLevel =
              c.weakEliteTier === 'elite' ? c.creatureLevel + 1
              : c.weakEliteTier === 'weak' ? c.creatureLevel - 1
              : c.creatureLevel
            const xpResult = calculateCreatureXP(adjustedLevel, partyLevel)

            return (
              <div
                key={c.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-secondary/30 hover:bg-secondary/50 group"
              >
                <LevelBadge level={adjustedLevel} size="sm" />
                {c.weakEliteTier !== 'normal' && (
                  <span
                    className={`text-[10px] px-1 rounded ${
                      c.weakEliteTier === 'elite'
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {c.weakEliteTier === 'elite' ? 'E' : 'W'}
                  </span>
                )}
                <span className="flex-1 text-sm font-medium truncate">{c.displayName}</span>
                <span className="text-xs font-mono text-muted-foreground">
                  {xpResult.xp != null ? `${xpResult.xp} XP` : 'OoR'}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-5 h-5 opacity-0 group-hover:opacity-100"
                  onClick={() => handleRemove(c.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* Add Creature toggle */}
      <div className="shrink-0 border-t border-border/50">
        <button
          onClick={() => setSearchOpen((v) => !v)}
          className="flex items-center gap-1.5 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
        >
          {searchOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          + Add Creature
        </button>

        {searchOpen && (
          <EncounterCreatureSearchPanel
            encounterId={encounterId}
            currentCombatants={combatants}
          />
        )}
      </div>
    </div>
  )
}
