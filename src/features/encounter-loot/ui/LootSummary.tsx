import { Badge } from '@/shared/ui/badge'
import type { EncounterLootSummary } from '../lib/types'

interface LootSummaryProps {
  summary: EncounterLootSummary
  itemCount: number
}

export function LootSummary({ summary, itemCount }: LootSummaryProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="rounded-md border border-border/60 bg-muted/25 px-3 py-2">
        <div className="text-[11px] font-medium uppercase text-muted-foreground">Items</div>
        <div className="mt-1 text-lg font-semibold">{itemCount}</div>
      </div>
      <div className="rounded-md border border-border/60 bg-muted/25 px-3 py-2">
        <div className="text-[11px] font-medium uppercase text-muted-foreground">Value</div>
        <div className="mt-1 flex items-center gap-1 text-lg font-semibold">
          {summary.totalGp.toFixed(2)}
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">gp</Badge>
        </div>
      </div>
      <div className="rounded-md border border-border/60 bg-muted/25 px-3 py-2">
        <div className="text-[11px] font-medium uppercase text-muted-foreground">Bulk</div>
        <div className="mt-1 text-lg font-semibold">{summary.totalBulk.toFixed(1)}</div>
      </div>
    </div>
  )
}
