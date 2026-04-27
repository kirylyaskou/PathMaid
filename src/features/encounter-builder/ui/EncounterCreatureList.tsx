import { X, AlertTriangle, Skull } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/button'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { LevelBadge } from '@/shared/ui/level-badge'
import { useEncounterBuilderStore } from '../model/store'
import { calculateCreatureXP, getHazardXp } from '@engine'
import { useShallow } from 'zustand/react/shallow'

export function EncounterCreatureList() {
  const { t } = useTranslation('common')
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
        <p className="text-sm">{t('encounterBuilder.addCreaturesOrHazards')}</p>
      </div>
    )
  }

  const totalEntries = draftCreatures.length + draftHazards.length

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <span className="text-xs text-muted-foreground font-medium">
          {t('encounterBuilder.entries', { count: totalEntries })}
        </span>
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearDraft}>
          {t('encounterBuilder.clearAll')}
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
                {xpResult.xp != null
                  ? <span className="text-xs font-mono text-muted-foreground">{xpResult.xp} XP</span>
                  : <span className="flex items-center gap-1 text-red-500"><Skull className="w-3 h-3 shrink-0" /><span className="text-xs font-mono">???</span></span>
                }
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
                className="flex items-center gap-2 px-2 py-1.5 rounded-md border-l-2 border-amber-600/60 bg-amber-950/30 hover:bg-amber-950/50 group"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <LevelBadge level={h.level} size="sm" />
                <span className="flex-1 text-sm font-medium truncate text-amber-100/90">
                  {h.name || `Hazard Lv${h.level}`}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${
                    h.type === 'complex'
                      ? 'bg-orange-900/50 text-orange-300 border border-orange-700/40'
                      : 'bg-amber-900/40 text-amber-400 border border-amber-700/30'
                  }`}
                >
                  {h.type === 'complex' ? 'complex' : 'simple'}
                </span>
                <span className="text-xs text-amber-500/70 font-mono w-12 text-right shrink-0">
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
