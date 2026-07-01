import { AlertTriangle, Skull, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/button'
import { LevelBadge } from '@/shared/ui/level-badge'
import { calculateCreatureXP, getHazardXp, getAdjustedLevel } from '@engine'
import type { EncounterSide } from '@engine'
import type { EncounterCombatant } from '@/entities/encounter'
import { cn } from '@/shared/lib/utils'

interface EncounterRosterItemProps {
  combatant: EncounterCombatant
  partyLevel: number
  onRemove: () => void
  onSetSide: (side: EncounterSide) => void
  onViewStatBlock: (creatureRef: string) => void
}

/**
 * One row in the encounter combatants list: level badge, elite/weak chip,
 * display name (clickable for bestiary creatures), per-entry XP, remove button.
 * PF2e Monster Core pg. 6-7: elite/weak shift creature level by ±1 for XP;
 * getAdjustedLevel also applies the display clamps for level -1/0/1.
 */
export function EncounterRosterItem({
  combatant, partyLevel, onRemove, onSetSide, onViewStatBlock,
}: EncounterRosterItemProps) {
  const { t } = useTranslation('common')
  const c = combatant
  const adjustedLevel = getAdjustedLevel(c.weakEliteTier, c.creatureLevel)
  const isHazard = c.isHazard === true
  const side = c.side ?? 'enemy'
  const xpResult = isHazard
    ? getHazardXp(c.creatureLevel, partyLevel, c.hazardType ?? 'simple')
    : calculateCreatureXP(adjustedLevel, partyLevel)

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1.5 group',
        isHazard
          ? 'border-l-2 border-amber-600/60 bg-amber-950/30 hover:bg-amber-950/50'
          : 'bg-secondary/30 hover:bg-secondary/50',
        side === 'ally' && 'border-l-2 border-emerald-600/60 bg-emerald-950/20 hover:bg-emerald-950/30',
      )}
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
          title={t('encounterBuilder.viewStatBlock')}
        >
          {c.displayName}
        </button>
      )}
      {xpResult.xp != null ? (
        <span className="text-xs font-mono text-muted-foreground">
          {side === 'ally'
            ? t('encounterBuilder.allyBudgetValue', { xp: xpResult.xp })
            : t('encounterBuilder.xpValue', { xp: xpResult.xp })}
        </span>
      ) : (
        <span className="flex items-center gap-1 text-red-500">
          <Skull className="w-3 h-3 shrink-0" />
          <span className="text-xs font-mono">???</span>
        </span>
      )}
      <div className="flex shrink-0 rounded border border-border/60 bg-background/50 p-0.5">
        <button
          type="button"
          className={cn(
            'h-5 rounded px-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors',
            side === 'enemy' && 'bg-pf-blood/80 text-white',
          )}
          onClick={() => onSetSide('enemy')}
        >
          {t('encounterBuilder.sideEnemy')}
        </button>
        <button
          type="button"
          className={cn(
            'h-5 rounded px-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors',
            side === 'ally' && 'bg-emerald-700/80 text-white',
          )}
          onClick={() => onSetSide('ally')}
        >
          {t('encounterBuilder.sideAlly')}
        </button>
      </div>
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
