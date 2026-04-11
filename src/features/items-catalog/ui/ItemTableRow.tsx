import type { ItemRow } from '@/shared/api'
import { ITEM_TYPE_LABELS, ITEM_TYPE_COLORS, RARITY_COLORS, formatPrice } from '@/entities/item'
import { cn } from '@/shared/lib/utils'
import { parseJsonArray } from '@/shared/lib/json'

interface ItemTableRowProps {
  item: ItemRow
  selectedType?: string | null
  onNameClick: (id: string) => void
  starSlot?: React.ReactNode
}

export function ItemTableRow({ item, selectedType, onNameClick, starSlot }: ItemTableRowProps) {
  const traits = parseJsonArray(item.traits)
  const typeColor = ITEM_TYPE_COLORS[item.item_type] ?? 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40'
  const typeLabel = ITEM_TYPE_LABELS[item.item_type] ?? item.item_type

  const isWeapon = selectedType === 'weapon'
  const isArmor  = selectedType === 'armor' || selectedType === 'shield'
  const hasSubcat = selectedType === 'consumable'

  const traitBadges = (maxCount: number) => (
    <>
      {traits.slice(0, maxCount).map((t) => (
        <span key={t} className="px-1 py-0.5 text-[10px] rounded bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
          {t}
        </span>
      ))}
      {traits.length > maxCount && (
        <span className="px-1 py-0.5 text-[10px] text-muted-foreground">+{traits.length - maxCount}</span>
      )}
    </>
  )

  return (
    <div className="flex items-center gap-2 px-3 h-9 border-b border-border/20 hover:bg-secondary/30 transition-colors">
      {/* Star */}
      <div className="w-7 shrink-0 flex items-center justify-center">
        {starSlot ?? null}
      </div>

      {/* Name */}
      <div className="flex-[20] min-w-0 overflow-hidden">
        <button
          className="font-medium text-[13px] text-left truncate w-full hover:text-primary hover:underline cursor-pointer"
          onClick={() => onNameClick(item.id)}
        >
          {item.name}
        </button>
      </div>

      {/* === WEAPON COLUMNS === */}
      {isWeapon && <>
        {/* Damage */}
        <div className="flex-[10] min-w-0 overflow-hidden">
          <span className="font-mono text-xs text-foreground">
            {item.damage_formula
              ? `${item.damage_formula}${item.damage_type ? ` ${item.damage_type.slice(0, 1).toUpperCase()}` : ''}`
              : <span className="text-muted-foreground">—</span>}
          </span>
        </div>
        {/* Category */}
        <div className="flex-[8] min-w-0 overflow-hidden">
          <span className="text-xs text-muted-foreground capitalize truncate block">
            {item.weapon_category ?? '—'}
          </span>
        </div>
        {/* Group */}
        <div className="flex-[8] min-w-0 overflow-hidden">
          <span className="text-xs text-muted-foreground capitalize truncate block">
            {item.weapon_group ?? '—'}
          </span>
        </div>
        {/* Traits */}
        <div className="flex-[12] min-w-0 flex flex-nowrap gap-0.5 overflow-hidden items-center">
          {traitBadges(2)}
        </div>
      </>}

      {/* === ARMOR / SHIELD COLUMNS === */}
      {isArmor && <>
        {/* AC+ */}
        <div className="flex-[6] min-w-0 text-right">
          <span className="font-mono text-xs">
            {item.ac_bonus != null ? `+${item.ac_bonus}` : '—'}
          </span>
        </div>
        {/* Dex Cap */}
        <div className="flex-[6] min-w-0 text-right">
          <span className="font-mono text-xs text-muted-foreground">
            {item.dex_cap != null ? `+${item.dex_cap}` : '—'}
          </span>
        </div>
        {/* Rarity */}
        <div className="flex-[6] min-w-0">
          {item.rarity && item.rarity !== 'common' ? (
            <span className={cn('text-[11px] capitalize', RARITY_COLORS[item.rarity] ?? 'text-muted-foreground')}>
              {item.rarity}
            </span>
          ) : null}
        </div>
        {/* Traits */}
        <div className="flex-[13] min-w-0 flex flex-nowrap gap-0.5 overflow-hidden items-center">
          {traitBadges(3)}
        </div>
      </>}

      {/* === CONSUMABLE (subcategory) COLUMNS === */}
      {hasSubcat && <>
        {/* Subcategory */}
        <div className="flex-[12] min-w-0 overflow-hidden">
          <span className="text-xs text-muted-foreground capitalize truncate block">
            {item.consumable_category ?? '—'}
          </span>
        </div>
        {/* Rarity */}
        <div className="flex-[7] min-w-0">
          {item.rarity && item.rarity !== 'common' ? (
            <span className={cn('text-[11px] capitalize', RARITY_COLORS[item.rarity] ?? 'text-muted-foreground')}>
              {item.rarity}
            </span>
          ) : null}
        </div>
        {/* Traits */}
        <div className="flex-[12] min-w-0 flex flex-nowrap gap-0.5 overflow-hidden items-center">
          {traitBadges(2)}
        </div>
      </>}

      {/* === DEFAULT COLUMNS === */}
      {!isWeapon && !isArmor && !hasSubcat && <>
        {/* Type badge */}
        <div className="flex-[8] min-w-0">
          <span className={cn('px-1.5 py-0.5 text-[10px] rounded border uppercase tracking-wider font-semibold', typeColor)}>
            {typeLabel}
          </span>
        </div>
        {/* Rarity */}
        <div className="flex-[7] min-w-0">
          {item.rarity && item.rarity !== 'common' ? (
            <span className={cn('text-[11px] capitalize', RARITY_COLORS[item.rarity] ?? 'text-muted-foreground')}>
              {item.rarity}
            </span>
          ) : null}
        </div>
        {/* Traits */}
        <div className="flex-[15] min-w-0 flex flex-nowrap gap-0.5 overflow-hidden items-center">
          {traitBadges(3)}
        </div>
      </>}

      {/* === COMMON TAIL COLUMNS === */}
      <div className="flex-[4] min-w-0 text-right">
        <span className="font-mono text-xs">{item.level}</span>
      </div>
      <div className="flex-[7] min-w-0 text-right">
        <span className="font-mono text-xs">{formatPrice(item.price_gp)}</span>
      </div>
      <div className="flex-[4] min-w-0 text-center">
        <span className="text-xs text-muted-foreground">{item.bulk ?? '—'}</span>
      </div>
      {!isWeapon && (
        <div className="flex-[9] min-w-0 overflow-hidden">
          <span className="text-xs text-muted-foreground truncate block">{item.usage ?? '—'}</span>
        </div>
      )}
      <div className="flex-[10] min-w-0 overflow-hidden">
        <span className="text-xs text-muted-foreground truncate block">{item.source_book ?? '—'}</span>
      </div>
    </div>
  )
}
