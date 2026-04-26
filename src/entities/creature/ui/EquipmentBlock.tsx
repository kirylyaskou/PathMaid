import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
} from '@/shared/ui/collapsible'
import { X, Backpack } from 'lucide-react'
import { SectionHeader } from '@/shared/ui/section-header'
import { IconButton } from '@/shared/ui/icon-button'
import { Input } from '@/shared/ui/input'
import type { CreatureItemRow } from '@/shared/api'
import { ITEM_TYPE_COLORS, ItemReferenceDrawer } from '@/entities/item'
import { useEquipment } from '../model/use-equipment'

interface EncounterContext {
  encounterId: string
  combatantId: string
  onInventoryChanged?: () => void
}

interface EquipmentItemRowProps {
  item: {
    name: string
    type: string
    qty: number
    damageFormula: string | null
    acBonus: number | null
    bulk?: string | null
  }
  onRemove?: () => void
  onRestore?: () => void
  isRemoved?: boolean
  foundryItemId?: string | null
  onItemClick?: (id: string) => void
  interactive: boolean
}

function EquipmentItemRow({
  item,
  onRemove,
  onRestore,
  isRemoved,
  foundryItemId,
  onItemClick,
  interactive,
}: EquipmentItemRowProps) {
  const typeColor = ITEM_TYPE_COLORS[item.type] ?? 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40'
  const qty = item.qty > 1 ? ` ×${item.qty}` : ''
  const stat = item.damageFormula ?? (item.acBonus !== null ? `AC +${item.acBonus}` : null)
  return (
    <div className={cn('group flex items-center gap-2 text-sm', isRemoved && 'opacity-40 line-through')}>
      <span className={cn('px-1 py-0.5 text-[9px] rounded border uppercase tracking-wider font-semibold shrink-0', typeColor)}>
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
      {interactive && onRemove && !isRemoved && (
        <IconButton intent="danger" showOnHover onClick={onRemove} className="ml-auto shrink-0">
          <X className="w-3 h-3" />
        </IconButton>
      )}
      {interactive && onRestore && isRemoved && (
        <button onClick={onRestore} className="ml-auto text-xs text-primary hover:underline shrink-0">undo</button>
      )}
    </div>
  )
}

export function EquipmentBlock({
  items,
  encounterContext,
}: {
  items: CreatureItemRow[]
  encounterContext?: EncounterContext
}) {
  const { t } = useTranslation()
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

  const interactive = Boolean(encounterContext)

  return (
    <>
      <Collapsible defaultOpen={false}>
        <SectionHeader trailing={<span className="text-xs text-muted-foreground">({totalCount})</span>}>
          <Backpack className="w-3.5 h-3.5 text-muted-foreground" />
          {t('statblock.equipment')}
        </SectionHeader>
        <CollapsibleContent>
          <div className="px-4 pb-3 pt-2 space-y-1">
            {visibleBase.map((item) => (
              <EquipmentItemRow
                key={item.id}
                item={{ name: item.item_name, type: item.item_type, qty: item.quantity, damageFormula: item.damage_formula, acBonus: item.ac_bonus, bulk: item.bulk }}
                onRemove={interactive ? () => handleRemove(item) : undefined}
                foundryItemId={item.foundry_item_id}
                onItemClick={(id) => setDrawerItemId(id)}
                interactive={interactive}
              />
            ))}
            {overrides.filter((o) => o.isRemoved).map((o) => {
              const base = items.find((i) => (i.foundry_item_id ?? i.item_name) === (o.itemFoundryId ?? o.itemName))
              if (!base) return null
              return (
                <EquipmentItemRow
                  key={o.id}
                  item={{ name: o.itemName, type: o.itemType, qty: o.quantity, damageFormula: o.damageFormula, acBonus: o.acBonus }}
                  isRemoved
                  onRestore={() => handleRestoreBase(base)}
                  foundryItemId={o.itemFoundryId}
                  onItemClick={(id) => setDrawerItemId(id)}
                  interactive={interactive}
                />
              )
            })}
            {addedItems.map((o) => (
              <EquipmentItemRow
                key={o.id}
                item={{ name: o.itemName, type: o.itemType, qty: o.quantity, damageFormula: o.damageFormula, acBonus: o.acBonus }}
                onRemove={() => handleRemoveAdded(o)}
                foundryItemId={o.itemFoundryId}
                onItemClick={(id) => setDrawerItemId(id)}
                interactive={interactive}
              />
            ))}

            {encounterContext && (
              <div className="relative mt-2">
                <Input
                  placeholder={t('statblock.addItem')}
                  value={addQuery}
                  onChange={(e) => setAddQuery(e.target.value)}
                  className="text-xs h-8 bg-secondary/40 border-border/50"
                />
                {addResults.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 top-full mt-0.5 rounded border border-border bg-popover shadow-md max-h-40 overflow-y-auto">
                    {addResults.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleAddItem(r)}
                        className="w-full flex items-center gap-2 px-2 py-1 text-xs text-left hover:bg-secondary/60 transition-colors"
                      >
                        <span className={cn('px-1 py-0.5 text-[9px] rounded border uppercase tracking-wider font-semibold shrink-0', ITEM_TYPE_COLORS[r.item_type] ?? '')}>{r.item_type[0].toUpperCase()}</span>
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
