import { AlertTriangle, Skull, X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { LevelBadge } from '@/shared/ui/level-badge'
import { calculateCreatureXP, getHazardXp, getAdjustedLevel } from '@engine'
import type { EncounterCombatant } from '@/entities/encounter'

interface EncounterRosterItemProps {
  combatant: EncounterCombatant
  partyLevel: number
  onRemove: () => void
  onViewStatBlock: (creatureRef: string) => void
}

/**
 * One row in the encounter combatants list: level badge, elite/weak chip,
 * display name (clickable for bestiary creatures), per-entry XP, remove button.
 * PF2e Monster Core pg. 6-7: elite/weak shift creature level by ±1 for XP;
 * getAdjustedLevel also applies the display clamps for level -1/0/1.
 */
export function EncounterRosterItem({
  combatant, partyLevel, onRemove, onViewStatBlock,
}: EncounterRosterItemProps) {
  const c = combatant
  const adjustedLevel = getAdjustedLevel(c.weakEliteTier, c.creatureLevel)
  const isHazard = c.isHazard === true
  const xpResult = isHazard
    ? getHazardXp(c.creatureLevel, partyLevel, c.hazardType ?? 'simple')
    : calculateCreatureXP(adjustedLevel, partyLevel)

  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md group ${
        isHazard
          ? 'border-l-2 border-amber-600/60 bg-amber-950/30 hover:bg-amber-950/50'
          : 'bg-secondary/30 hover:bg-secondary/50'
      }`}
    >
      {isHazard && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
      <LevelBadge level={adjustedLevel} size="sm" />
      {!isHazard && c.weakEliteTier !== 'normal' && (
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
      {isHazard || !c.creatureRef ? (
        <span className="flex-1 text-sm font-medium truncate">{c.displayName}</span>
      ) : (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onViewStatBlock(c.creatureRef!)
          }}
          className="flex-1 text-sm font-medium truncate text-left hover:text-pf-gold transition-colors"
          title="View stat block"
        >
          {c.displayName}
        </button>
      )}
      {xpResult.xp != null ? (
        <span className="text-xs font-mono text-muted-foreground">{xpResult.xp} XP</span>
      ) : (
        <span className="flex items-center gap-1 text-red-500">
          <Skull className="w-3 h-3 shrink-0" />
          <span className="text-xs font-mono">???</span>
        </span>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="w-5 h-5 opacity-0 group-hover:opacity-100"
        onClick={onRemove}
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  )
}
