import { Minus, Plus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useEncounterBuilderStore } from '../model/store'
import { useShallow } from 'zustand/react/shallow'

export function PartyConfigBar() {
  const { partyLevel, partySize, setPartyLevel, setPartySize } = useEncounterBuilderStore(
    useShallow((s) => ({
      partyLevel: s.partyLevel,
      partySize: s.partySize,
      setPartyLevel: s.setPartyLevel,
      setPartySize: s.setPartySize,
    }))
  )

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

    </div>
  )
}
