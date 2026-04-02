import { X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { LevelBadge } from '@/shared/ui/level-badge'
import { useEncounterBuilderStore } from '../model/store'
import { calculateCreatureXP, getHazardXp } from '@engine'
import { useShallow } from 'zustand/react/shallow'

export function EncounterCreatureList() {
  const {
    draftCreatures,
    draftHazards,
    partyLevel,
    removeCreatureFromDraft,
    removeHazardFromDraft,
    clearDraft,
  } = useEncounterBuilderStore(
    useShallow((s) => ({
      draftCreatures: s.draftCreatures,
      draftHazards: s.draftHazards,
      partyLevel: s.partyLevel,
      removeCreatureFromDraft: s.removeCreatureFromDraft,
      removeHazardFromDraft: s.removeHazardFromDraft,
      clearDraft: s.clearDraft,
    }))
  )

  const isEmpty = draftCreatures.length === 0 && draftHazards.length === 0

  if (isEmpty) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">Add creatures or hazards to build an encounter</p>
      </div>
    )
  }

  const totalEntries = draftCreatures.length + draftHazards.length

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <span className="text-xs text-muted-foreground font-medium">
          {totalEntries} entr{totalEntries !== 1 ? 'ies' : 'y'}
        </span>
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearDraft}>
          Clear All
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {draftCreatures.map((dc) => {
            const xpResult = calculateCreatureXP(dc.adjustedLevel, partyLevel)
            return (
              <div
                key={dc.instanceId}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-secondary/30 hover:bg-secondary/50 group"
              >
                <LevelBadge level={dc.adjustedLevel} size="sm" />
                {dc.tier !== 'normal' && (
                  <span
                    className={`text-[10px] px-1 rounded ${dc.tier === 'elite' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}
                  >
                    {dc.tier === 'elite' ? 'E' : 'W'}
                  </span>
                )}
                <span className="flex-1 text-sm font-medium truncate">{dc.name}</span>
                <span className="text-xs font-mono text-muted-foreground">
                  {xpResult.xp != null ? `${xpResult.xp} XP` : 'OoR'}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-5 h-5 opacity-0 group-hover:opacity-100"
                  onClick={() => removeCreatureFromDraft(dc.instanceId)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )
          })}

          {draftHazards.map((h) => {
            const xpResult = getHazardXp(h.level, partyLevel, h.type)
            return (
              <div
                key={h.instanceId}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-secondary/30 hover:bg-secondary/50 group"
              >
                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-400 font-medium">
                  {h.type === 'complex' ? 'Complex' : 'Simple'}
                </span>
                <span className="flex-1 text-sm font-medium truncate">
                  {h.name || `Hazard Lv${h.level}`}
                </span>
                <span className="text-xs text-muted-foreground font-mono">Lv{h.level}</span>
                <span className="text-xs text-muted-foreground font-mono w-12 text-right">
                  {xpResult.outOfRange ? '\u2014' : `${xpResult.xp} XP`}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-5 h-5 opacity-0 group-hover:opacity-100"
                  onClick={() => removeHazardFromDraft(h.instanceId)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
