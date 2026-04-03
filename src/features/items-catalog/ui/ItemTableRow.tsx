import type { ItemRow } from '@/shared/api'
import { ITEM_TYPE_LABELS, ITEM_TYPE_COLORS, formatPrice } from '@/entities/item'
import { cn } from '@/shared/lib/utils'

interface ItemTableRowProps {
  item: ItemRow
  onNameClick: (id: string) => void
  starSlot?: React.ReactNode
}

export function ItemTableRow({ item, onNameClick, starSlot }: ItemTableRowProps) {
  const traits: string[] = item.traits ? JSON.parse(item.traits) : []
  const typeColor = ITEM_TYPE_COLORS[item.item_type] ?? 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40'
  const typeLabel = ITEM_TYPE_LABELS[item.item_type] ?? item.item_type

  return (
    <div className="flex items-center gap-2 px-3 h-9 border-b border-border/20 hover:bg-secondary/30 transition-colors">
      {/* Star column */}
      <div className="w-8 shrink-0 flex items-center justify-center">
        {starSlot ?? null}
      </div>

      {/* Name column */}
      <div className="flex-1 min-w-[160px] overflow-hidden">
        <button
          className="font-medium text-[13px] text-left truncate w-full hover:text-primary hover:underline cursor-pointer"
          onClick={() => onNameClick(item.id)}
        >
          {item.name}
        </button>
      </div>

      {/* Category column */}
      <div className="w-[90px] shrink-0">
        <span className={cn('px-1.5 py-0.5 text-[10px] rounded border uppercase tracking-wider font-semibold', typeColor)}>
          {typeLabel}
        </span>
      </div>

      {/* Traits column */}
      <div className="w-[180px] shrink-0 flex flex-wrap gap-0.5 overflow-hidden">
        {traits.slice(0, 3).map((t) => (
          <span
            key={t}
            className="px-1 py-0.5 text-[10px] rounded bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider"
          >
            {t}
          </span>
        ))}
        {traits.length > 3 && (
          <span className="px-1 py-0.5 text-[10px] text-muted-foreground">+{traits.length - 3}</span>
        )}
      </div>

      {/* Level column */}
      <div className="w-14 shrink-0 text-right">
        <span className="font-mono text-xs">{item.level}</span>
      </div>

      {/* Price column */}
      <div className="w-20 shrink-0 text-right">
        <span className="font-mono text-xs">{formatPrice(item.price_gp)}</span>
      </div>

      {/* Bulk column */}
      <div className="w-12 shrink-0 text-center">
        <span className="text-xs text-muted-foreground">{item.bulk ?? '—'}</span>
      </div>

      {/* Usage column */}
      <div className="w-[100px] shrink-0 overflow-hidden">
        <span className="text-xs text-muted-foreground truncate block">{item.usage ?? '—'}</span>
      </div>

      {/* Source column */}
      <div className="w-[100px] shrink-0 overflow-hidden">
        <span className="text-xs text-muted-foreground truncate block">{item.source_book ?? '—'}</span>
      </div>
    </div>
  )
}
