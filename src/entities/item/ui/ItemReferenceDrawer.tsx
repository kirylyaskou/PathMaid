import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetFooter } from '@/shared/ui/sheet'
import { Button } from '@/shared/ui/button'
import { getItemById } from '@/shared/api'
import type { ItemRow } from '@/shared/api'
import { formatPrice, ITEM_TYPE_LABELS, ITEM_TYPE_COLORS, RARITY_COLORS } from '@/entities/item'
import { cn } from '@/shared/lib/utils'
import { stripHtml } from '@/shared/lib/html'
import { SafeHtml } from '@/shared/lib/safe-html'
import { useContentTranslation } from '@/shared/i18n'
import { ClickableFormula } from '@/shared/ui/clickable-formula'
import { SpellInlineCard } from '@/entities/spell'
import { parseJsonArray } from '@/shared/lib/json'


interface ItemReferenceDrawerProps {
  itemId: string | null
  onClose: () => void
  extraActions?: React.ReactNode
}

export function ItemReferenceDrawer({ itemId, onClose, extraActions }: ItemReferenceDrawerProps) {
  const [item, setItem] = useState<ItemRow | null>(null)

  useEffect(() => {
    if (!itemId) {
      setItem(null)
      return
    }
    getItemById(itemId).then(setItem).catch(() => setItem(null))
  }, [itemId])

  const traits = parseJsonArray(item?.traits)
  const typeColor = item ? (ITEM_TYPE_COLORS[item.item_type] ?? 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40') : ''
  const typeLabel = item ? (ITEM_TYPE_LABELS[item.item_type] ?? item.item_type) : ''

  // Phase 80: item translation lookup
  const { data: translation } = useContentTranslation('item', item?.name, item?.level ?? null)

  return (
    <Sheet open={!!itemId} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent side="right" className="w-[420px] sm:w-[480px] overflow-y-auto flex flex-col gap-0 p-0">
        {item && (
          <>
            <SheetHeader className="p-4 pb-3 border-b border-border/30">
              <SheetTitle className="text-base font-semibold leading-tight">
                {translation?.nameLoc ?? item.name}
              </SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">Level {item.level}</span>
                {item.rarity && item.rarity !== 'common' && (
                  <span className={cn('text-xs font-medium capitalize', RARITY_COLORS[item.rarity])}>
                    {item.rarity}
                  </span>
                )}
              </div>
            </SheetHeader>

            <div className="p-4 space-y-4 flex-1">
              {/* Key stats bar */}
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Level</span>
                  <span className="text-sm font-medium">{item.level}</span>
                </div>
                {item.rarity && (
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Rarity</span>
                    <span className={cn('text-sm font-medium capitalize', RARITY_COLORS[item.rarity])}>{item.rarity}</span>
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Price</span>
                  <span className="text-sm font-mono">{formatPrice(item.price_gp)}</span>
                </div>
                {item.bulk && (
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Bulk</span>
                    <span className="text-sm font-medium">{item.bulk}</span>
                  </div>
                )}
                {item.usage && (
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Usage</span>
                    <span className="text-sm text-muted-foreground">{item.usage}</span>
                  </div>
                )}
              </div>

              {/* Type badge + category */}
              <div className="flex items-center gap-2">
                <span className={cn('px-1.5 py-0.5 text-[10px] rounded border uppercase tracking-wider font-semibold', typeColor)}>
                  {typeLabel}
                </span>
                {item.weapon_category && (
                  <span className="text-xs text-muted-foreground capitalize">{item.weapon_category}</span>
                )}
                {item.weapon_group && (
                  <span className="text-xs text-muted-foreground capitalize">• {item.weapon_group}</span>
                )}
                {item.consumable_category && (
                  <span className="text-xs text-muted-foreground capitalize">{item.consumable_category}</span>
                )}
              </div>

              {/* Traits */}
              {traits.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {traits.map((t) => (
                    <span
                      key={t}
                      className="px-1 py-0.5 text-[10px] rounded bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Type-specific stats */}
              {(item.damage_formula || item.damage_type || item.weapon_category || item.weapon_group) && (
                <div className="space-y-1">
                  {item.damage_formula && (
                    <div className="flex gap-2 items-center text-xs">
                      <span className="text-muted-foreground">Damage:</span>
                      <ClickableFormula
                        formula={item.damage_formula}
                        label={`${item.name} damage`}
                        className="text-xs"
                      />
                      {item.damage_type && <span className="text-muted-foreground">{item.damage_type}</span>}
                    </div>
                  )}
                </div>
              )}

              {item.ac_bonus !== null && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span className="text-muted-foreground">AC: <span className="text-foreground font-semibold">+{item.ac_bonus}</span></span>
                  {item.dex_cap !== null && <span className="text-muted-foreground">Dex cap: <span className="text-foreground">+{item.dex_cap}</span></span>}
                  {item.check_penalty !== null && item.check_penalty !== 0 && <span className="text-muted-foreground">Check: <span className="text-foreground">{item.check_penalty}</span></span>}
                  {item.speed_penalty !== null && item.speed_penalty !== 0 && <span className="text-muted-foreground">Speed: <span className="text-foreground">{item.speed_penalty} ft</span></span>}
                  {item.strength_req !== null && <span className="text-muted-foreground">Str req: <span className="text-foreground">{item.strength_req}</span></span>}
                </div>
              )}

              {(item.uses_max !== null || item.consumable_category) && item.item_type === 'consumable' && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {item.uses_max !== null && item.uses_max > 1 && (
                    <span className="text-muted-foreground">Uses: <span className="text-foreground">{item.uses_max}</span></span>
                  )}
                </div>
              )}

              {/* Description — RU translation overrides EN when available */}
              {translation ? (
                <SafeHtml html={translation.textLoc} className="text-[13px]" />
              ) : (
                item.description && (
                  <p className="text-[13px] text-foreground/80 leading-relaxed">
                    {stripHtml(item.description)}
                  </p>
                )
              )}

              {/* Linked Spell */}
              {item.linked_spell_id && (
                <SpellInlineCard spellId={item.linked_spell_id} />
              )}

              {/* Source */}
              {item.source_book && (
                <p className="text-xs text-muted-foreground">Source: {item.source_book}</p>
              )}
            </div>

            <SheetFooter className="p-4 pt-2 border-t border-border/30 flex-row items-center gap-2">
              {extraActions}
              <SheetClose asChild>
                <Button variant="ghost" size="sm">Close panel</Button>
              </SheetClose>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
