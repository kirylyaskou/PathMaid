import { useRef, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { ItemRow } from '@/shared/api'
import { ItemTableRow } from './ItemTableRow'

interface ItemsTableProps {
  items: ItemRow[]
  sortField: 'level' | 'price' | null
  sortDir: 'asc' | 'desc'
  onToggleSort: (field: 'level' | 'price') => void
  onItemClick: (id: string) => void
  renderStar?: (item: ItemRow) => React.ReactNode
}

function SortIcon({ field, sortField, sortDir }: {
  field: 'level' | 'price'
  sortField: 'level' | 'price' | null
  sortDir: 'asc' | 'desc'
}) {
  if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />
  if (sortDir === 'asc') return <ArrowUp className="w-3 h-3" />
  return <ArrowDown className="w-3 h-3" />
}

export function ItemsTable({ items, sortField, sortDir, onToggleSort, onItemClick, renderStar }: ItemsTableProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const sortedItems = useMemo(() => {
    if (!sortField) return items
    return [...items].sort((a, b) => {
      const av = sortField === 'level' ? (a.level ?? 0) : (a.price_gp ?? 0)
      const bv = sortField === 'level' ? (b.level ?? 0) : (b.price_gp ?? 0)
      return sortDir === 'asc' ? av - bv : bv - av
    })
  }, [items, sortField, sortDir])

  const rowVirtualizer = useVirtualizer({
    count: sortedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 10,
  })

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      {/* Sticky header */}
      <div className="flex items-center gap-2 px-3 h-9 bg-card border-b border-border/40 shrink-0 text-xs text-muted-foreground font-medium">
        <div className="w-8 shrink-0" />
        <div className="flex-1 min-w-[160px]">Name</div>
        <div className="w-[90px] shrink-0">Category</div>
        <div className="w-[180px] shrink-0">Traits</div>
        <button
          onClick={() => onToggleSort('level')}
          className="w-14 shrink-0 text-right flex items-center justify-end gap-1 hover:text-foreground transition-colors"
        >
          Level <SortIcon field="level" sortField={sortField} sortDir={sortDir} />
        </button>
        <button
          onClick={() => onToggleSort('price')}
          className="w-20 shrink-0 text-right flex items-center justify-end gap-1 hover:text-foreground transition-colors"
        >
          Price <SortIcon field="price" sortField={sortField} sortDir={sortDir} />
        </button>
        <div className="w-12 shrink-0 text-center">Bulk</div>
        <div className="w-[100px] shrink-0">Usage</div>
        <div className="w-[100px] shrink-0">Source</div>
      </div>

      {/* Virtualized rows */}
      <div ref={parentRef} className="flex-1 overflow-y-auto">
        <div
          style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => (
            <div
              key={sortedItems[virtualRow.index].id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <ItemTableRow
                item={sortedItems[virtualRow.index]}
                onNameClick={onItemClick}
                starSlot={renderStar?.(sortedItems[virtualRow.index])}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
