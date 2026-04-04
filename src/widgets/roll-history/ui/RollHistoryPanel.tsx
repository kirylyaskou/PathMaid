import { Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Separator } from '@/shared/ui/separator'
import { useRollStore } from '@/shared/model/roll-store'
import type { Roll } from '@engine'

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function RollRow({ roll }: { roll: Roll }) {
  const isNat20 = roll.dice.some((d) => d.sides === 20 && d.value === 20)
  const isNat1 = roll.dice.some((d) => d.sides === 20 && d.value === 1)

  return (
    <div className="px-3 py-1.5 hover:bg-muted/50 transition-colors duration-150 border-b border-border/20 last:border-0">
      {/* Top row: label + total */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Badge variant="secondary" className="text-[10px] font-mono shrink-0">{roll.formula}</Badge>
          {roll.label && (
            <span className="text-xs text-foreground/70 truncate">{roll.label}</span>
          )}
        </div>
        <span
          className="text-sm font-mono font-bold shrink-0"
          style={{ color: isNat1 ? 'var(--pf-blood)' : 'var(--pf-gold)' }}
        >
          {roll.total}
          {isNat20 && <span className="text-[10px] ml-1" style={{ color: 'var(--pf-gold)' }}>★</span>}
          {isNat1 && <span className="text-[10px] ml-1" style={{ color: 'var(--pf-blood)' }}>✕</span>}
        </span>
      </div>
      {/* Bottom row: source + combat + time + dice */}
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-[10px] text-muted-foreground font-mono w-9 shrink-0">
          {formatTime(roll.timestamp)}
        </span>
        {roll.source && (
          <span className="text-[10px] text-primary/70 truncate max-w-[100px]">{roll.source}</span>
        )}
        {roll.combatId && (
          <span className="text-[10px] text-muted-foreground/60 truncate max-w-[80px]">#{roll.combatId.slice(0, 6)}</span>
        )}
        <span className="text-[10px] font-mono text-muted-foreground/50 ml-auto">
          [{roll.dice.map((d) => d.value).join('+')}
          {roll.modifier !== 0 ? (roll.modifier > 0 ? `+${roll.modifier}` : `${roll.modifier}`) : ''}]
        </span>
      </div>
    </div>
  )
}

export function RollHistoryPanel() {
  const rolls = useRollStore((state) => state.rolls)
  const clearRolls = useRollStore((state) => state.clearRolls)

  const displayRolls = [...rolls].reverse().slice(0, 50)

  return (
    <div className="w-[420px]">
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center">
          <span className="text-sm font-semibold">Roll History</span>
          <Badge variant="secondary" className="ml-2">
            {rolls.length === 1 ? '1 roll' : `${rolls.length} rolls`}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearRolls}
          disabled={rolls.length === 0}
          aria-label="Clear roll history"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Clear
        </Button>
      </div>

      <Separator />

      {/* Content */}
      <div className="max-h-[320px] overflow-y-auto">
        {rolls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <p className="text-sm font-semibold">No rolls yet</p>
            <p className="text-xs">Rolls will appear here during the session.</p>
          </div>
        ) : (
          displayRolls.map((roll) => <RollRow key={roll.id} roll={roll} />)
        )}
      </div>
    </div>
  )
}
