import { cn } from '@/shared/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible'
import { ChevronDown, X, Backpack } from 'lucide-react'
import type { CreatureItemRow } from '@/shared/api'
import { ITEM_TYPE_COLORS, ItemReferenceDrawer } from '@/entities/item'
import { useEquipment } from '../model/use-equipment'

interface EncounterContext {
  encounterId: string
  combatantId: string
  onInventoryChanged?: () => void
}

export function EquipmentBlock({
  items,
  encounterContext,
}: {
  items: CreatureItemRow[]
  encounterContext?: EncounterContext
}) {
  const {
    overrides,
    addQuery, setAddQuery,
    addResults,
    drawerItemId, setDrawerItemId,
    handleRemove, handleRestoreBase, handleAddItem, handleRemoveAdded,
    removedIds: _removedIds,
    addedItems, visibleBase, totalCount,
  } = useEquipment(items, encounterContext)
  if (totalCount === 0 && !encounterContext) return null

  function ItemRow_({ item, onRemove, onRestore, isRemoved, foundryItemId, onItemClick }: {
    item: { name: string; type: string; qty: number; damageFormula: string | null; acBonus: number | null; bulk?: string | null }
    onRemove?: () => void
    onRestore?: () => void
    isRemoved?: boolean
    foundryItemId?: string | null
    onItemClick?: (id: string) => void
  }) {
    const typeColor = ITEM_TYPE_COLORS[item.type] ?? 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40'
    const qty = item.qty > 1 ? ` ×${item.qty}` : ''
    const stat = item.damageFormula ?? (item.acBonus !== null ? `AC +${item.acBonus}` : null)
    return (
      <div className={cn("group flex items-center gap-2 text-sm", isRemoved && "opacity-40 line-through")}>
        <span className={cn("px-1 py-0.5 text-[9px] rounded border uppercase tracking-wider font-semibold shrink-0", typeColor)}>
          {item.type[0].toUpperCase()}
        </span>
        {foundryItemId && onItemClick ? (
          <button
            className="font-medium flex-1 min-w-0 truncate text-left hover:text-primary hover:underline cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onItemClick(foundryItemId) }}
          >
            {item.name}{qty}
          </button>
        ) : (
          <span className="font-medium flex-1 min-w-0 truncate">{item.name}{qty}</span>
        )}
        {stat && <span className="text-xs font-mono text-muted-foreground shrink-0">{stat}</span>}
        {item.bulk && item.bulk !== '-' && <span className="text-xs text-muted-foreground shrink-0">L{item.bulk}</span>}
        {encounterContext && onRemove && !isRemoved && (
          <button onClick={onRemove} className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-opacity shrink-0">
            <X className="w-3 h-3" />
          </button>
        )}
        {encounterContext && onRestore && isRemoved && (
          <button onClick={onRestore} className="ml-auto text-xs text-primary hover:underline shrink-0">undo</button>
        )}
      </div>
    )
  }

  return (
    <>
      <Collapsible defaultOpen={false}>
        <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-primary/40 hover:from-primary/15 hover:to-transparent transition-colors">
          <div className="flex items-center gap-2">
            <Backpack className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-semibold text-sm text-foreground">Equipment</span>
            <span className="text-xs text-muted-foreground">({totalCount})</span>
          </div>
          <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-3 pt-2 space-y-1">
            {visibleBase.map((item) => (
              <ItemRow_
                key={item.id}
                item={{ name: item.item_name, type: item.item_type, qty: item.quantity, damageFormula: item.damage_formula, acBonus: item.ac_bonus, bulk: item.bulk }}
                onRemove={encounterContext ? () => handleRemove(item) : undefined}
                foundryItemId={item.foundry_item_id}
                onItemClick={(id) => setDrawerItemId(id)}
              />
            ))}
            {/* Removed items shown struck-through with undo */}
            {overrides.filter((o) => o.isRemoved).map((o) => {
              const base = items.find((i) => (i.foundry_item_id ?? i.item_name) === (o.itemFoundryId ?? o.itemName))
              if (!base) return null
              return (
                <ItemRow_
                  key={o.id}
                  item={{ name: o.itemName, type: o.itemType, qty: o.quantity, damageFormula: o.damageFormula, acBonus: o.acBonus }}
                  isRemoved
                  onRestore={() => handleRestoreBase(base)}
                  foundryItemId={o.itemFoundryId}
                  onItemClick={(id) => setDrawerItemId(id)}
                />
              )
            })}
            {/* Added items */}
            {addedItems.map((o) => (
              <ItemRow_
                key={o.id}
                item={{ name: o.itemName, type: o.itemType, qty: o.quantity, damageFormula: o.damageFormula, acBonus: o.acBonus }}
                onRemove={() => handleRemoveAdded(o)}
                foundryItemId={o.itemFoundryId}
                onItemClick={(id) => setDrawerItemId(id)}
              />
            ))}

            {/* Add item row — encounter context only */}
            {encounterContext && (
              <div className="relative mt-2">
                <input
                  type="text"
                  placeholder="Add item…"
                  value={addQuery}
                  onChange={(e) => setAddQuery(e.target.value)}
                  className="w-full text-xs px-2 h-8 rounded-md border border-border/50 bg-secondary/40 placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
                {addResults.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 top-full mt-0.5 rounded border border-border bg-popover shadow-md max-h-40 overflow-y-auto">
                    {addResults.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleAddItem(r)}
                        className="w-full flex items-center gap-2 px-2 py-1 text-xs text-left hover:bg-secondary/60 transition-colors"
                      >
                        <span className={cn("px-1 py-0.5 text-[9px] rounded border uppercase tracking-wider font-semibold shrink-0", ITEM_TYPE_COLORS[r.item_type] ?? '')}>{r.item_type[0].toUpperCase()}</span>
                        <span className="flex-1 truncate">{r.name}</span>
                        {r.damage_formula && <span className="font-mono text-muted-foreground shrink-0">{r.damage_formula}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
      <ItemReferenceDrawer itemId={drawerItemId} onClose={() => setDrawerItemId(null)} />
    </>
  )
}
