import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
} from '@/shared/ui/collapsible'
import { FlaskConical, Plus, X, Backpack } from 'lucide-react'
import { SectionHeader } from '@/shared/ui/section-header'
import { IconButton } from '@/shared/ui/icon-button'
import { Input } from '@/shared/ui/input'
import { getCustomItemsByIds, getItemsByIds, type CreatureItemRow, type CustomItemRef, type CustomItemRow, type ItemRow } from '@/shared/api'
import { ITEM_TYPE_COLORS, ItemReferenceDrawer } from '@/entities/item'
import { useEquipment } from '../model/use-equipment'
import { formatEquipmentDamageFormula, parseInlineDamageFormula, type EquipmentAttackItem } from '../lib/equipment-strike'

interface EncounterContext {
  encounterId: string
  combatantId: string
  inventoryVersion?: number
  onInventoryChanged?: () => void
}

const EMPTY_CUSTOM_REFS = [] as const

interface EquipmentItemRowProps {
  item: {
    name: string
    type: string
    qty: number
    damageFormula: string | null
    descriptionLoc?: string
    acBonus: number | null
    bulk?: string | null
  }
  onRemove?: () => void
  onRestore?: () => void
  isRemoved?: boolean
  foundryItemId?: string | null
  onItemClick?: (id: string) => void
  interactive: boolean
  lootUsage?: {
    spentQuantity: number
    remainingQuantity: number
  }
  onSpendLoot?: (delta: number) => void
}

function LootUsageControls({
  remainingQuantity,
  spentQuantity,
  onSpendLoot,
}: {
  remainingQuantity: number
  spentQuantity: number
  onSpendLoot: (delta: number) => void
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        className="inline-flex h-6 items-center gap-1 rounded border border-primary/40 bg-primary/10 px-1.5 text-[11px] font-medium text-primary hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={remainingQuantity <= 0}
        title="Use one item"
        aria-label="Use one item"
        onClick={() => onSpendLoot(1)}
      >
        <FlaskConical className="h-3 w-3" />
        Use
      </button>
      <span className="min-w-12 text-center text-[11px] font-medium text-muted-foreground">
        {remainingQuantity} left
      </span>
      <button
        type="button"
        className="inline-flex h-6 w-6 items-center justify-center rounded border border-border/60 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        disabled={spentQuantity <= 0}
        title="Restore one item"
        aria-label="Restore one item"
        onClick={() => onSpendLoot(-1)}
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  )
}

function EquipmentItemRow({
  item,
  onRemove,
  onRestore,
  isRemoved,
  foundryItemId,
  onItemClick,
  interactive,
  lootUsage,
  onSpendLoot,
}: EquipmentItemRowProps) {
  const typeColor = ITEM_TYPE_COLORS[item.type] ?? 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40'
  const qty = item.qty > 1 ? ` ×${item.qty}` : ''
  const stat =
    item.damageFormula ??
    parseInlineDamageFormula(item.descriptionLoc)?.formula ??
    (item.acBonus !== null ? `AC +${item.acBonus}` : null)
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
      {(lootUsage && onSpendLoot) || (interactive && (onRemove || onRestore)) ? (
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {lootUsage && onSpendLoot && (
            <LootUsageControls
              remainingQuantity={lootUsage.remainingQuantity}
              spentQuantity={lootUsage.spentQuantity}
              onSpendLoot={onSpendLoot}
            />
          )}
          {interactive && onRemove && !isRemoved && (
            <IconButton intent="danger" showOnHover onClick={onRemove} className="shrink-0">
              <X className="w-3 h-3" />
            </IconButton>
          )}
          {interactive && onRestore && isRemoved && (
            <button onClick={onRestore} className="text-xs text-primary hover:underline shrink-0">undo</button>
          )}
        </div>
      ) : null}
    </div>
  )
}

interface CustomEquipmentItemRowProps {
  item: CustomItemRow
  quantity: number
  onRemove?: () => void
  onRestore?: () => void
  isRemoved?: boolean
  interactive: boolean
  lootUsage?: {
    spentQuantity: number
    remainingQuantity: number
  }
  onSpendLoot?: (delta: number) => void
}

function getLocalItemId(id: string): string {
  const parts = id.split(':')
  return parts[parts.length - 1] ?? id
}

function CustomEquipmentItemRow({
  item,
  quantity,
  onRemove,
  onRestore,
  isRemoved,
  interactive,
  lootUsage,
  onSpendLoot,
}: CustomEquipmentItemRowProps) {
  const typeColor = ITEM_TYPE_COLORS[item.item_type] ?? 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40'
  const qty = quantity > 1 ? ` ×${quantity}` : ''
  const stat =
    formatEquipmentDamageFormula(item.damage_formula, item.damage_type, item.description) ??
    (item.ac_bonus !== null ? `AC +${item.ac_bonus}` : null)
  return (
    <div className={cn('group flex items-center gap-2 text-sm', isRemoved && 'opacity-40 line-through')}>
      <span className={cn('px-1 py-0.5 text-[9px] rounded border uppercase tracking-wider font-semibold shrink-0', typeColor)}>
        C
      </span>
      <span className="font-medium flex-1 min-w-0 truncate">{item.name}{qty}</span>
      {stat && <span className="text-xs font-mono text-muted-foreground shrink-0">{stat}</span>}
      {(lootUsage && onSpendLoot) || (interactive && (onRemove || onRestore)) ? (
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {lootUsage && onSpendLoot && (
            <LootUsageControls
              remainingQuantity={lootUsage.remainingQuantity}
              spentQuantity={lootUsage.spentQuantity}
              onSpendLoot={onSpendLoot}
            />
          )}
          {interactive && onRemove && !isRemoved && (
            <IconButton intent="danger" showOnHover onClick={onRemove} className="shrink-0">
              <X className="w-3 h-3" />
            </IconButton>
          )}
          {interactive && onRestore && isRemoved && (
            <button onClick={onRestore} className="text-xs text-primary hover:underline shrink-0">undo</button>
          )}
        </div>
      ) : null}
    </div>
  )
}

function getDisplayDamageFormula(
  description: string | null | undefined,
  damageFormula: string | null,
  damageType: string | null,
): string | null {
  return formatEquipmentDamageFormula(damageFormula, damageType, description) ??
    parseInlineDamageFormula(description)?.formula ??
    null
}

export function EquipmentBlock({
  items,
  encounterContext,
  itemsLocById,
  onAttackItemsChange,
  customItemRefs,
}: {
  items: CreatureItemRow[]
  customItemRefs?: CustomItemRef[]
  encounterContext?: EncounterContext
  itemsLocById?: Map<string, { description?: string }>
  onAttackItemsChange?: (items: EquipmentAttackItem[]) => void
}) {
  const { t } = useTranslation()
  const [customItems, setCustomItems] = useState<CustomItemRow[]>([])
  const {
    overrides,
    addQuery, setAddQuery,
    addResults, customAddResults,
    drawerItemId, setDrawerItemId,
    handleRemove, handleRestoreBase, handleAddItem, handleAddCustomItem, handleRemoveAdded,
    handleRemoveBaseCustom, handleRestoreBaseCustom, handleRemoveAddedCustom,
    removedIds: _removedIds, removedCustomItemIds,
    addedItems, addedCustomItems, visibleBase, totalCount: baseTotalCount,
    getLootUsage, handleSpendLootItem,
  } = useEquipment(items, encounterContext)

  const customRefs = customItemRefs ?? EMPTY_CUSTOM_REFS
  const customIds = useMemo(
    () => Array.from(new Set([
      ...customRefs.map((ref) => ref.customItemId),
      ...addedCustomItems.map((ref) => ref.customItemId),
    ])),
    [addedCustomItems, customRefs],
  )

  useEffect(() => {
    if (customIds.length === 0) {
      setCustomItems([])
      return
    }
    let cancelled = false
    void getCustomItemsByIds(customIds)
      .then((rows) => {
        if (!cancelled) setCustomItems(rows)
      })
      .catch(() => {
        if (!cancelled) setCustomItems([])
      })
    return () => {
      cancelled = true
    }
  }, [customIds])

  const customById = useMemo(
    () => new Map(customItems.map((item) => [item.id, item])),
    [customItems],
  )

  const visibleBaseCustomRefs = useMemo(
    () => customRefs.filter((ref) => !removedCustomItemIds.has(ref.customItemId)),
    [customRefs, removedCustomItemIds],
  )
  const totalCount = baseTotalCount + visibleBaseCustomRefs.length

  const catalogItemIds = useMemo(
    () => Array.from(new Set([
      ...visibleBase.flatMap((item) => item.foundry_item_id ? [item.foundry_item_id] : []),
      ...addedItems.flatMap((item) => item.itemFoundryId ? [item.itemFoundryId] : []),
    ])),
    [addedItems, visibleBase],
  )
  const [catalogItems, setCatalogItems] = useState<ItemRow[]>([])

  useEffect(() => {
    if (catalogItemIds.length === 0) {
      setCatalogItems([])
      return
    }
    let cancelled = false
    void getItemsByIds(catalogItemIds)
      .then((rows) => {
        if (!cancelled) setCatalogItems(rows)
      })
      .catch(() => {
        if (!cancelled) setCatalogItems([])
      })
    return () => {
      cancelled = true
    }
  }, [catalogItemIds])

  const catalogById = useMemo(
    () => new Map(catalogItems.map((item) => [item.id, item])),
    [catalogItems],
  )

  const attackItems = useMemo(
    () => [
      ...visibleBase.map((item) => {
        const localId = getLocalItemId(item.id)
        const catalogItem = item.foundry_item_id ? catalogById.get(item.foundry_item_id) : undefined
        return {
          id: localId,
          name: item.item_name,
          itemType: item.item_type,
          damageFormula: item.damage_formula,
          traits: item.traits ?? catalogItem?.traits,
          descriptionLoc: itemsLocById?.get(localId)?.description ?? catalogItem?.description ?? undefined,
        }
      }),
      ...addedItems.map((item) => {
        const catalogItem = item.itemFoundryId ? catalogById.get(item.itemFoundryId) : undefined
        return {
          id: item.itemFoundryId ?? item.id,
          name: item.itemName,
          itemType: item.itemType,
          damageFormula: item.damageFormula,
          traits: catalogItem?.traits,
          descriptionLoc: catalogItem?.description ?? undefined,
        }
      }),
      ...visibleBaseCustomRefs.flatMap((ref) => {
        const item = customById.get(ref.customItemId)
        return item
          ? [{
              id: item.id,
              name: item.name,
              itemType: item.item_type,
              damageFormula: formatEquipmentDamageFormula(item.damage_formula, item.damage_type, item.description),
              traits: item.traits,
              descriptionLoc: item.description ?? undefined,
            }]
          : []
      }),
      ...addedCustomItems.flatMap((ref) => {
        const item = customById.get(ref.customItemId)
        return item
          ? [{
              id: item.id,
              name: item.name,
              itemType: item.item_type,
              damageFormula: formatEquipmentDamageFormula(item.damage_formula, item.damage_type, item.description),
              traits: item.traits,
              descriptionLoc: item.description ?? undefined,
            }]
          : []
      }),
    ],
    [addedCustomItems, addedItems, catalogById, customById, itemsLocById, visibleBase, visibleBaseCustomRefs],
  )

  useEffect(() => {
    if (!onAttackItemsChange) return
    onAttackItemsChange(attackItems)
  }, [attackItems, onAttackItemsChange])

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
                item={{
                  name: item.item_name,
                  type: item.item_type,
                  qty: item.quantity,
                  damageFormula: item.damage_formula,
                  descriptionLoc: itemsLocById?.get(getLocalItemId(item.id))?.description,
                  acBonus: item.ac_bonus,
                  bulk: item.bulk,
                }}
                onRemove={interactive ? () => handleRemove(item) : undefined}
                foundryItemId={item.foundry_item_id}
                onItemClick={(id) => setDrawerItemId(id)}
                interactive={interactive}
                lootUsage={interactive && item.item_type === 'consumable' ? getLootUsage(item.id, 'base', item.quantity) : undefined}
                onSpendLoot={interactive && item.item_type === 'consumable' ? (delta) => handleSpendLootItem(item.id, 'base', item.quantity, delta) : undefined}
              />
            ))}
            {overrides.filter((o) => o.isRemoved).map((o) => {
              const base = items.find((i) => (i.foundry_item_id ?? i.item_name) === (o.itemFoundryId ?? o.itemName))
              if (!base) return null
              const localId = getLocalItemId(base.id)
              return (
                <EquipmentItemRow
                  key={o.id}
                  item={{
                    name: o.itemName,
                    type: o.itemType,
                    qty: o.quantity,
                    damageFormula: o.damageFormula,
                    descriptionLoc: itemsLocById?.get(localId)?.description,
                    acBonus: o.acBonus,
                  }}
                  isRemoved
                  onRestore={() => handleRestoreBase(base)}
                  foundryItemId={o.itemFoundryId}
                  onItemClick={(id) => setDrawerItemId(id)}
                  interactive={interactive}
                />
              )
            })}
            {customRefs.filter((ref) => removedCustomItemIds.has(ref.customItemId)).map((ref) => {
              const item = customById.get(ref.customItemId)
              if (!item) return null
              const overrideId = `${encounterContext?.encounterId}:${encounterContext?.combatantId}:custom:${ref.customItemId}`
              return (
                <CustomEquipmentItemRow
                  key={ref.id}
                  item={item}
                  quantity={ref.quantity}
                  isRemoved
                  onRestore={() => handleRestoreBaseCustom(overrideId)}
                  interactive={interactive}
                />
              )
            })}
            {visibleBaseCustomRefs.map((ref) => {
              const item = customById.get(ref.customItemId)
              if (!item) return null
              return (
                <CustomEquipmentItemRow
                  key={ref.id}
                  item={item}
                  quantity={ref.quantity}
                  onRemove={interactive ? () => handleRemoveBaseCustom(ref.customItemId) : undefined}
                  interactive={interactive}
                  lootUsage={interactive && item.item_type === 'consumable' ? getLootUsage(ref.id, 'custom', ref.quantity) : undefined}
                  onSpendLoot={interactive && item.item_type === 'consumable' ? (delta) => handleSpendLootItem(ref.id, 'custom', ref.quantity, delta) : undefined}
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
                lootUsage={o.itemType === 'consumable' ? getLootUsage(o.id, 'encounter', o.quantity) : undefined}
                onSpendLoot={o.itemType === 'consumable' ? (delta) => handleSpendLootItem(o.id, 'encounter', o.quantity, delta) : undefined}
              />
            ))}
            {addedCustomItems.map((ref) => {
              const item = customById.get(ref.customItemId)
              if (!item) return null
              return (
                <CustomEquipmentItemRow
                  key={ref.id}
                  item={item}
                  quantity={ref.quantity}
                  onRemove={() => handleRemoveAddedCustom(ref)}
                  interactive={interactive}
                  lootUsage={item.item_type === 'consumable' ? getLootUsage(ref.id, 'custom', ref.quantity) : undefined}
                  onSpendLoot={item.item_type === 'consumable' ? (delta) => handleSpendLootItem(ref.id, 'custom', ref.quantity, delta) : undefined}
                />
              )
            })}

            {encounterContext && (
              <div className="relative mt-2">
                <Input
                  placeholder={t('statblock.addItem')}
                  value={addQuery}
                  onChange={(e) => setAddQuery(e.target.value)}
                  className="text-xs h-8 bg-secondary/40 border-border/50"
                />
                {(addResults.length > 0 || customAddResults.length > 0) && (
                  <div className="absolute z-10 left-0 right-0 top-full mt-0.5 rounded border border-border bg-popover shadow-md max-h-40 overflow-y-auto">
                    {customAddResults.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleAddCustomItem(r)}
                        className="w-full flex items-center gap-2 px-2 py-1 text-xs text-left hover:bg-secondary/60 transition-colors"
                      >
                        <span className={cn('px-1 py-0.5 text-[9px] rounded border uppercase tracking-wider font-semibold shrink-0', ITEM_TYPE_COLORS[r.item_type] ?? '')}>C</span>
                        <span className="flex-1 truncate">{r.name}</span>
                        <span className="text-muted-foreground shrink-0">Custom</span>
                      </button>
                    ))}
                    {addResults.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleAddItem(r)}
                        className="w-full flex items-center gap-2 px-2 py-1 text-xs text-left hover:bg-secondary/60 transition-colors"
                      >
                        <span className={cn('px-1 py-0.5 text-[9px] rounded border uppercase tracking-wider font-semibold shrink-0', ITEM_TYPE_COLORS[r.item_type] ?? '')}>{r.item_type[0].toUpperCase()}</span>
                        <span className="flex-1 truncate">{r.name}</span>
                        {getDisplayDamageFormula(r.description, r.damage_formula, r.damage_type) && (
                          <span className="font-mono text-muted-foreground shrink-0">
                            {getDisplayDamageFormula(r.description, r.damage_formula, r.damage_type)}
                          </span>
                        )}
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
