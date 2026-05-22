import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Package, Plus, X } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import { SearchInput } from '@/shared/ui/search-input'
import { formatEquipmentDamageFormula } from '@/entities/creature'
import { ITEM_TYPE_COLORS } from '@/entities/item'
import { searchItems, type CreatureItemRow, type ItemRow } from '@/shared/api'
import type { BuilderTabsProps } from '../BuilderTabs'

const SEARCH_LIMIT = 8

function toCreatureItem(
  item: ItemRow,
  creatureId: string,
  sortOrder: number,
): CreatureItemRow {
  return {
    id: `${creatureId || 'custom'}:${item.id}:${crypto.randomUUID()}`,
    creature_id: creatureId,
    item_name: item.name,
    item_type: item.item_type,
    foundry_item_id: item.id,
    quantity: 1,
    bulk: item.bulk,
    damage_formula: formatEquipmentDamageFormula(item.damage_formula, item.damage_type, item.description),
    ac_bonus: item.ac_bonus,
    traits: item.traits,
    sort_order: sortOrder,
  }
}

function itemStat(item: CreatureItemRow): string | null {
  return item.damage_formula ?? (item.ac_bonus != null ? `AC +${item.ac_bonus}` : null)
}

interface InventoryRowProps {
  item: CreatureItemRow
  onQuantityChange: (quantity: number) => void
  onRemove: () => void
}

function InventoryRow({ item, onQuantityChange, onRemove }: InventoryRowProps) {
  const { t } = useTranslation('common')
  const typeColor = ITEM_TYPE_COLORS[item.item_type] ?? 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40'
  const stat = itemStat(item)

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_5rem_auto_auto] items-center gap-2 rounded-md border border-border/45 bg-card px-3 py-2">
      <span className={`rounded border px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${typeColor}`}>
        {item.item_type[0]?.toUpperCase() ?? '?'}
      </span>
      <span className="truncate text-sm font-medium">{item.item_name}</span>
      <Input
        type="number"
        min={1}
        value={item.quantity}
        aria-label={t('customCreatureBuilder.inventoryTab.quantityAriaLabel', { name: item.item_name })}
        className="h-7 font-mono text-xs"
        onChange={(e) => onQuantityChange(Math.max(1, Number(e.target.value) || 1))}
      />
      {stat && <span className="font-mono text-xs text-muted-foreground">{stat}</span>}
      <button
        type="button"
        aria-label={t('customCreatureBuilder.inventoryTab.removeItemAriaLabel', { name: item.item_name })}
        className="p-1 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

interface SearchResultProps {
  item: ItemRow
  onAdd: (item: ItemRow) => void
}

function SearchResult({ item, onAdd }: SearchResultProps) {
  const typeColor = ITEM_TYPE_COLORS[item.item_type] ?? 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40'
  const stat = formatEquipmentDamageFormula(item.damage_formula, item.damage_type, item.description) ??
    (item.ac_bonus != null ? `AC +${item.ac_bonus}` : null)

  return (
    <button
      type="button"
      className="flex items-center gap-2 rounded-md border border-border/40 bg-background/45 px-2 py-1.5 text-left hover:border-primary/50 hover:bg-secondary/50"
      onClick={() => onAdd(item)}
    >
      <Plus className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className={`rounded border px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${typeColor}`}>
        {item.item_type[0]?.toUpperCase() ?? '?'}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span>
      {stat && <span className="shrink-0 font-mono text-xs text-muted-foreground">{stat}</span>}
    </button>
  )
}

export function InventoryTab({ state, dispatch }: BuilderTabsProps) {
  const { t } = useTranslation('common')
  const { form } = state
  const equipment = form.equipment ?? []
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [results, setResults] = useState<ItemRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 200)
    return () => clearTimeout(id)
  }, [query])

  useEffect(() => {
    const searchTerm = debounced.trim()
    if (searchTerm.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const rows = await searchItems(searchTerm)
        if (!cancelled) setResults(rows.slice(0, SEARCH_LIMIT))
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [debounced])

  const emptyMessage = useMemo(() => {
    if (loading) return t('customCreatureBuilder.inventoryTab.searching')
    if (debounced.trim().length < 2) return t('customCreatureBuilder.inventoryTab.startSearch')
    if (results.length === 0) return t('customCreatureBuilder.inventoryTab.noItemsFound')
    return null
  }, [debounced, loading, results.length, t])

  function addItem(item: ItemRow) {
    const existingIndex = equipment.findIndex((it) => it.foundry_item_id === item.id)
    if (existingIndex >= 0) {
      const existing = equipment[existingIndex]
      if (!existing) return
      dispatch({
        type: 'UPDATE_EQUIPMENT_ITEM',
        index: existingIndex,
        item: { ...existing, quantity: existing.quantity + 1 },
      })
      return
    }
    dispatch({
      type: 'ADD_EQUIPMENT_ITEM',
      item: toCreatureItem(item, form.id, equipment.length),
    })
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-base font-semibold">{t('customCreatureBuilder.inventoryTab.heading')}</h2>
      <div className="space-y-2 rounded-md border border-border/50 bg-secondary/20 p-3">
        <SearchInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('customCreatureBuilder.inventoryTab.searchPlaceholder')}
          className="h-8 text-sm bg-background/60"
          loading={loading}
        />
        {emptyMessage && (
          <p className="py-1 text-xs text-muted-foreground">{emptyMessage}</p>
        )}
        {results.length > 0 && (
          <div className="grid gap-1">
            {results.map((item) => (
              <SearchResult key={item.id} item={item} onAdd={addItem} />
            ))}
          </div>
        )}
      </div>

      {equipment.length === 0 ? (
        <div className="flex items-center justify-between rounded-md border border-dashed border-border/50 bg-secondary/20 p-4">
          <p className="text-sm text-muted-foreground">{t('customCreatureBuilder.inventoryTab.noItemsAdded')}</p>
          <Package className="h-5 w-5 text-muted-foreground/60" />
        </div>
      ) : (
        <div className="space-y-2">
          {equipment.map((item, index) => (
            <InventoryRow
              key={item.id}
              item={item}
              onQuantityChange={(quantity) =>
                dispatch({
                  type: 'UPDATE_EQUIPMENT_ITEM',
                  index,
                  item: { ...item, quantity },
                })
              }
              onRemove={() => dispatch({ type: 'REMOVE_EQUIPMENT_ITEM', index })}
            />
          ))}
        </div>
      )}
    </div>
  )
}
