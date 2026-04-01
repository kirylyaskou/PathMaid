import { Minus, Plus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import {
  useEncounterBuilderStore,
  selectEncounterResult,
} from '../model/store'
import { useShallow } from 'zustand/react/shallow'
import type { ThreatRating } from '@engine'

const threatColors: Record<ThreatRating, string> = {
  trivial: 'bg-pf-threat-trivial text-background',
  low: 'bg-pf-threat-low text-background',
  moderate: 'bg-pf-threat-moderate text-background',
  severe: 'bg-pf-threat-severe text-background',
  extreme: 'bg-pf-threat-extreme text-background',
}

export function PartyConfigBar() {
  const { partyLevel, partySize, setPartyLevel, setPartySize } = useEncounterBuilderStore(
    useShallow((s) => ({
      partyLevel: s.partyLevel,
      partySize: s.partySize,
      setPartyLevel: s.setPartyLevel,
      setPartySize: s.setPartySize,
    }))
  )

  const totalXp = useEncounterBuilderStore((s) => selectEncounterResult(s).totalXp)
  const threat = useEncounterBuilderStore((s) => selectEncounterResult(s).rating)

  return (
    <div className="flex items-center gap-4 p-3 border-b border-border/50 bg-card/50">
      {/* Party Level */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground font-medium">Party Lvl</span>
        <div className="flex items-center">
          <Button
            variant="outline"
            size="icon"
            className="w-6 h-6 rounded-r-none"
            disabled={partyLevel <= 1}
            onClick={() => setPartyLevel(partyLevel - 1)}
          >
            <Minus className="w-3 h-3" />
          </Button>
          <div className="w-8 h-6 flex items-center justify-center border-y border-border text-sm font-bold">
            {partyLevel}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="w-6 h-6 rounded-l-none"
            disabled={partyLevel >= 20}
            onClick={() => setPartyLevel(partyLevel + 1)}
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Party Size */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground font-medium">Size</span>
        <div className="flex items-center">
          <Button
            variant="outline"
            size="icon"
            className="w-6 h-6 rounded-r-none"
            disabled={partySize <= 1}
            onClick={() => setPartySize(partySize - 1)}
          >
            <Minus className="w-3 h-3" />
          </Button>
          <div className="w-8 h-6 flex items-center justify-center border-y border-border text-sm font-bold">
            {partySize}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="w-6 h-6 rounded-l-none"
            disabled={partySize >= 8}
            onClick={() => setPartySize(partySize + 1)}
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* XP Badge */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-bold">{totalXp} XP</span>
        <span
          className={cn(
            'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest',
            threatColors[threat]
          )}
        >
          {threat}
        </span>
      </div>
    </div>
  )
}
