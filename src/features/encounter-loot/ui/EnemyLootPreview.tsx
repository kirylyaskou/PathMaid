import { Badge } from '@/shared/ui/badge'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { cn } from '@/shared/lib/utils'
import { sourceKindLabel } from '../lib/resolve-loot'
import type { EncounterLootGroup, ResolvedEncounterLootItem } from '../lib/types'

interface EnemyLootPreviewProps {
  groups: EncounterLootGroup[]
  className?: string
}

function itemMeta(item: ResolvedEncounterLootItem): string {
  const parts = [
    item.combatantName,
    item.priceGp === null ? null : `${item.priceGp} gp`,
    item.bulk ? `Bulk ${item.bulk}` : null,
  ].filter((value): value is string => value !== null && value.length > 0)
  return parts.join(' · ')
}

function quantityLabel(item: ResolvedEncounterLootItem): string {
  if (item.spentQuantity <= 0) return `${item.remainingQuantity}/${item.quantity}`
  return `${item.remainingQuantity}/${item.quantity} left`
}

export function EnemyLootPreview({ groups, className }: EnemyLootPreviewProps) {
  if (groups.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
        No loot resolved for this encounter.
      </div>
    )
  }

  return (
    <ScrollArea className={cn('h-[420px] pr-3', className)}>
      <div className="space-y-4">
        {groups.map((group) => (
          <section key={group.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{group.label}</h3>
              <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{group.items.length}</Badge>
            </div>
            <div className="space-y-1.5">
              {group.items.map((item) => (
                <div
                  key={`${item.combatantId ?? 'encounter'}:${item.sourceItemKind}:${item.sourceItemKey}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-border/50 bg-card px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-medium">{item.name}</span>
                      <Badge variant="secondary" className="h-5 shrink-0 px-1.5 text-[10px]">
                        {sourceKindLabel(item.sourceItemKind)}
                      </Badge>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">{itemMeta(item)}</div>
                    {item.notes && <div className="mt-1 text-xs text-muted-foreground">{item.notes}</div>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={item.spentQuantity > 0 ? 'default' : 'outline'} className="h-7 min-w-16 justify-center font-mono text-xs">
                      {quantityLabel(item)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </ScrollArea>
  )
}
