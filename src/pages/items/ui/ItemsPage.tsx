import { useState, useEffect, useCallback } from 'react'
import { Search, Package } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import { searchItems } from '@/shared/api'
import type { ItemRow } from '@/shared/api'
import { ITEM_TYPE_LABELS, ITEM_TYPE_COLORS, RARITY_COLORS } from '@/entities/item'
import { cn } from '@/shared/lib/utils'

const ITEM_TYPES = ['weapon', 'armor', 'shield', 'consumable', 'equipment', 'treasure', 'backpack', 'kit', 'book', 'effect'] as const
const RARITIES = ['common', 'uncommon', 'rare', 'unique'] as const

function formatPrice(gp: number | null): string {
  if (gp === null) return '—'
  if (gp >= 1) return `${gp} gp`
  if (gp >= 0.1) return `${Math.round(gp * 10)} sp`
  return `${Math.round(gp * 100)} cp`
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/@\w+\[[^\]]*\](?:\{[^}]*\})?/g, '')
    .trim()
}

function ItemCard({ item, expanded, onToggle }: {
  item: ItemRow
  expanded: boolean
  onToggle: () => void
}) {
  const traits: string[] = item.traits ? JSON.parse(item.traits) : []
  const typeColor = ITEM_TYPE_COLORS[item.item_type] ?? 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40'
  const typeLabel = ITEM_TYPE_LABELS[item.item_type] ?? item.item_type
  const rarityColor = RARITY_COLORS[item.rarity ?? 'common'] ?? ''

  return (
    <div
      className={cn(
        "rounded-md border transition-colors cursor-pointer",
        expanded
          ? "border-primary/40 bg-card"
          : "border-border/40 bg-secondary/30 hover:border-border/70 hover:bg-secondary/50"
      )}
      onClick={onToggle}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="font-semibold text-sm flex-1 min-w-0 truncate">{item.name}</span>

        {/* Rarity dot */}
        {item.rarity && item.rarity !== 'common' && (
          <span className={cn("text-xs shrink-0 font-medium capitalize", rarityColor)}>
            {item.rarity}
          </span>
        )}

        {/* Bulk */}
        {item.bulk && item.bulk !== '-' && (
          <span className="text-xs text-muted-foreground shrink-0">
            Bulk {item.bulk}
          </span>
        )}

        {/* Price */}
        <span className="text-xs text-muted-foreground shrink-0">
          {formatPrice(item.price_gp)}
        </span>

        {/* Level */}
        <span className="text-xs text-muted-foreground shrink-0">
          Lv {item.level}
        </span>

        {/* Type badge */}
        <span className={cn("px-1.5 py-0.5 text-[10px] rounded border uppercase tracking-wider font-semibold shrink-0", typeColor)}>
          {typeLabel}
        </span>
      </div>

      {/* Traits — always visible if present */}
      {traits.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 pb-1.5">
          {traits.slice(0, 5).map((t) => (
            <span
              key={t}
              className="px-1 py-0.5 text-[10px] rounded bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider"
            >
              {t}
            </span>
          ))}
          {traits.length > 5 && (
            <span className="px-1 py-0.5 text-[10px] text-muted-foreground">+{traits.length - 5} more</span>
          )}
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-border/30 pt-2">
          {/* Type-specific stats */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">

            {/* Weapon stats */}
            {item.damage_formula && (
              <span className="text-muted-foreground">
                Damage: <span className="font-mono text-pf-blood">{item.damage_formula}</span>
              </span>
            )}
            {item.weapon_category && (
              <span className="text-muted-foreground">
                Category: <span className="text-foreground capitalize">{item.weapon_category}</span>
              </span>
            )}
            {item.weapon_group && (
              <span className="text-muted-foreground">
                Group: <span className="text-foreground capitalize">{item.weapon_group}</span>
              </span>
            )}

            {/* Armor stats */}
            {item.ac_bonus !== null && (
              <span className="text-muted-foreground">
                AC: <span className="text-foreground font-semibold">+{item.ac_bonus}</span>
              </span>
            )}
            {item.dex_cap !== null && (
              <span className="text-muted-foreground">
                Dex cap: <span className="text-foreground">+{item.dex_cap}</span>
              </span>
            )}
            {item.check_penalty !== null && item.check_penalty !== 0 && (
              <span className="text-muted-foreground">
                Check: <span className="text-foreground">{item.check_penalty}</span>
              </span>
            )}
            {item.speed_penalty !== null && item.speed_penalty !== 0 && (
              <span className="text-muted-foreground">
                Speed: <span className="text-foreground">{item.speed_penalty} ft</span>
              </span>
            )}
            {item.strength_req !== null && (
              <span className="text-muted-foreground">
                Str req: <span className="text-foreground">{item.strength_req}</span>
              </span>
            )}

            {/* Consumable stats */}
            {item.uses_max !== null && item.uses_max > 1 && (
              <span className="text-muted-foreground">
                Uses: <span className="text-foreground">{item.uses_max}</span>
              </span>
            )}
            {item.consumable_category && (
              <span className="text-muted-foreground">
                Type: <span className="text-foreground capitalize">{item.consumable_category}</span>
              </span>
            )}

            {/* Source */}
            {item.source_book && (
              <span className="text-muted-foreground">
                Source: <span className="text-foreground">{item.source_book}</span>
              </span>
            )}
          </div>

          {/* All traits expanded */}
          {traits.length > 5 && (
            <div className="flex flex-wrap gap-1">
              {traits.map((t) => (
                <span key={t} className="px-1 py-0.5 text-[10px] rounded bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">{t}</span>
              ))}
            </div>
          )}

          {/* Description */}
          {item.description && (
            <p className="text-xs text-foreground/75 leading-relaxed line-clamp-6">
              {stripHtml(item.description)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export function ItemsPage() {
  const [query, setQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [minLevel, setMinLevel] = useState<string>('')
  const [maxLevel, setMaxLevel] = useState<string>('')
  const [selectedRarity, setSelectedRarity] = useState<string | null>(null)
  const [items, setItems] = useState<ItemRow[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async (
    q: string,
    type: string | null,
    minLv: string,
    maxLv: string,
    rarity: string | null
  ) => {
    setLoading(true)
    try {
      const results = await searchItems(
        q,
        type ?? undefined,
        minLv ? parseInt(minLv) : undefined,
        maxLv ? parseInt(maxLv) : undefined,
        rarity ?? undefined
      )
      setItems(results)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(
      () => load(query, selectedType, minLevel, maxLevel, selectedRarity),
      200
    )
    return () => clearTimeout(timer)
  }, [query, selectedType, minLevel, maxLevel, selectedRarity, load])

  const hasFilters = selectedType || minLevel || maxLevel || selectedRarity

  function clearFilters() {
    setSelectedType(null)
    setMinLevel('')
    setMaxLevel('')
    setSelectedRarity(null)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="p-3 border-b border-border/50 space-y-2 shrink-0">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search items…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Type filter */}
        <div className="flex flex-wrap gap-1">
          {ITEM_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType((prev) => (prev === t ? null : t))}
              className={cn(
                "px-2 py-0.5 text-[10px] rounded border uppercase tracking-wider font-semibold transition-opacity",
                ITEM_TYPE_COLORS[t],
                selectedType && selectedType !== t && "opacity-30"
              )}
            >
              {ITEM_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Level range + Rarity */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Lv</span>
            <Input
              type="number"
              placeholder="min"
              value={minLevel}
              onChange={(e) => setMinLevel(e.target.value)}
              className="w-14 h-6 text-xs px-1.5"
              min={0}
              max={25}
            />
            <span>–</span>
            <Input
              type="number"
              placeholder="max"
              value={maxLevel}
              onChange={(e) => setMaxLevel(e.target.value)}
              className="w-14 h-6 text-xs px-1.5"
              min={0}
              max={25}
            />
          </div>

          <div className="flex gap-1">
            {RARITIES.map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRarity((prev) => (prev === r ? null : r))}
                className={cn(
                  "px-2 py-0.5 text-[10px] rounded border capitalize font-medium transition-colors",
                  selectedRarity === r
                    ? cn(RARITY_COLORS[r], "bg-secondary border-current")
                    : "text-muted-foreground border-border/40 hover:border-border"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Count row */}
      <div className="px-3 py-1.5 shrink-0 border-b border-border/30">
        <p className="text-xs text-muted-foreground">
          {loading ? 'Searching…' : `${items.length} item${items.length !== 1 ? 's' : ''}`}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-2 text-primary hover:underline"
            >
              clear filters
            </button>
          )}
        </p>
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {items.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Package className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">
              {query || hasFilters
                ? 'No items match the filters'
                : 'Run sync to import items'}
            </p>
          </div>
        )}
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            expanded={expandedId === item.id}
            onToggle={() => setExpandedId((prev) => (prev === item.id ? null : item.id))}
          />
        ))}
      </div>
    </div>
  )
}
