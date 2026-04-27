import { useRef, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ItemRow } from '@/shared/api'
import { ItemTableRow } from './ItemTableRow'

interface ItemsTableProps {
  items: ItemRow[]
  selectedType?: string | null
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

export function ItemsTable({ items, selectedType, sortField, sortDir, onToggleSort, onItemClick, renderStar }: ItemsTableProps) {
  const { t } = useTranslation('common')
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

  const isWeapon = selectedType === 'weapon'
  const isArmor  = selectedType === 'armor' || selectedType === 'shield'
  const hasSubcat = selectedType === 'consumable'

  const header = (
    <div className="flex items-center gap-2 px-3 h-9 bg-card border-b border-border/40 shrink-0 text-xs text-muted-foreground font-medium">
      <div className="w-7 shrink-0" />
      <div className="flex-[20] min-w-0">{t('items.columns.name')}</div>

      {isWeapon && <>
        <div className="flex-[10] min-w-0">{t('items.columns.damage')}</div>
        <div className="flex-[8] min-w-0">{t('items.columns.category')}</div>
        <div className="flex-[8] min-w-0">{t('items.columns.group')}</div>
        <div className="flex-[12] min-w-0">{t('items.columns.traits')}</div>
      </>}

      {isArmor && <>
        <div className="flex-[6] min-w-0 text-right">{t('items.columns.acBonus')}</div>
        <div className="flex-[6] min-w-0 text-right">{t('items.columns.dexCap')}</div>
        <div className="flex-[6] min-w-0">{t('items.columns.rarity')}</div>
        <div className="flex-[13] min-w-0">{t('items.columns.traits')}</div>
      </>}

      {hasSubcat && <>
        <div className="flex-[12] min-w-0">{t('items.columns.subcategory')}</div>
        <div className="flex-[7] min-w-0">{t('items.columns.rarity')}</div>
        <div className="flex-[12] min-w-0">{t('items.columns.traits')}</div>
      </>}

      {!isWeapon && !isArmor && !hasSubcat && <>
        <div className="flex-[8] min-w-0">{t('items.columns.category')}</div>
        <div className="flex-[7] min-w-0">{t('items.columns.rarity')}</div>
        <div className="flex-[15] min-w-0">{t('items.columns.traits')}</div>
      </>}

      <button
        onClick={() => onToggleSort('level')}
        className="flex-[4] min-w-0 text-right flex items-center justify-end gap-1 hover:text-foreground transition-colors"
      >
        {t('items.columns.level')} <SortIcon field="level" sortField={sortField} sortDir={sortDir} />
      </button>
      <button
        onClick={() => onToggleSort('price')}
        className="flex-[7] min-w-0 text-right flex items-center justify-end gap-1 hover:text-foreground transition-colors"
      >
        {t('items.columns.price')} <SortIcon field="price" sortField={sortField} sortDir={sortDir} />
      </button>
      <div className="flex-[4] min-w-0 text-center">{t('items.columns.bulk')}</div>
      {!isWeapon && <div className="flex-[9] min-w-0">{t('items.columns.usage')}</div>}
      <div className="flex-[10] min-w-0">{t('items.columns.source')}</div>
    </div>
  )

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      {header}
      <div ref={parentRef} className="flex-1 overflow-y-auto">
        <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
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
                selectedType={selectedType}
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
