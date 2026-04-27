import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetFooter } from '@/shared/ui/sheet'
import { Button } from '@/shared/ui/button'
import { getSpellById } from '@/shared/api'
import type { SpellRow } from '@/shared/api'
import { cn } from '@/shared/lib/utils'
import {  sanitizeFoundryText } from '@/shared/lib/foundry-tokens'
import { SafeHtml } from '@/shared/lib/safe-html'
import { NoTranslationBadge } from '@/shared/ui/no-translation-badge'
import { useContentTranslation, useCurrentLocale } from '@/shared/i18n'
import { getTraitLabel } from '@/shared/i18n/pf2e-content'
import { TraitPill } from '@/shared/ui/trait-pill'
import type { SpellStructuredLoc } from '@/shared/i18n/pf2e-content/lib'
import { stripRarityMarker } from '@/shared/lib/display-name'

// Save type names live in PF2E.Saves* but are not exposed via the
// dictionary getter family. Inline mapping covers all three PF2e saves;
// extending this table is cheaper than introducing a new dict module.
const SAVE_RU_LABELS: Record<string, string> = {
  reflex: 'Рефлекс',
  fortitude: 'Стойкость',
  will: 'Воля',
}
import { TRADITION_COLORS, actionCostLabel, rankLabel, parseDamageDisplay, parseAreaDisplay } from '../lib/helpers'
import { parseJsonArray } from '@/shared/lib/json'

interface SpellReferenceDrawerProps {
  spellId: string | null
  onClose: () => void
}

export function SpellReferenceDrawer({ spellId, onClose }: SpellReferenceDrawerProps) {
  const { t } = useTranslation('common')
  const [spell, setSpell] = useState<SpellRow | null>(null)

  useEffect(() => {
    if (!spellId) {
      setSpell(null)
      return
    }
    getSpellById(spellId).then(setSpell).catch(() => setSpell(null))
  }, [spellId])

  const traditions = parseJsonArray(spell?.traditions)
  const traits = parseJsonArray(spell?.traits)
  const damageDisplay = parseDamageDisplay(spell?.damage ?? null)
  const areaDisplay = parseAreaDisplay(spell?.area ?? null)

  const { data: translation } = useContentTranslation('spell', spell?.name, spell?.rank ?? null)
  const locale = useCurrentLocale()
  const showUntranslatedBadge = locale === 'ru' && translation === null
  // Spell structured overlay shares the JSON column with the typed
  // monster overlay; parse it locally because the generic `structured`
  // accessor is shaped for monsters.
  const spellLoc = useMemo<SpellStructuredLoc | null>(() => {
    if (!translation?.structuredJson) return null
    try {
      return JSON.parse(translation.structuredJson) as SpellStructuredLoc
    } catch {
      return null
    }
  }, [translation?.structuredJson])

  return (
    <Sheet open={!!spellId} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent side="right" className="w-[420px] sm:w-[480px] overflow-y-auto flex flex-col gap-0 p-0">
        {spell && (
          <>
            <SheetHeader className="p-4 pb-3 border-b border-border/30 relative">
              {showUntranslatedBadge && (
                <div className="absolute top-2 right-10 z-10">
                  <NoTranslationBadge />
                </div>
              )}
              <SheetTitle className="text-base font-semibold leading-tight">
                {stripRarityMarker(translation?.nameLoc ?? spell.name)}
              </SheetTitle>
              <div className="flex items-center flex-wrap gap-2 mt-1">
                <span className="text-xs text-muted-foreground">{rankLabel(spell.rank)}</span>
                {traditions.map((trad) => (
                  <span
                    key={trad}
                    className={cn(
                      'px-1.5 py-0.5 text-[10px] rounded border uppercase tracking-wider font-semibold',
                      TRADITION_COLORS[trad] ?? 'bg-secondary text-secondary-foreground border-border'
                    )}
                  >
                    {getTraitLabel(trad.toLowerCase(), locale)}
                  </span>
                ))}
              </div>
            </SheetHeader>

            <div className="p-4 space-y-4 flex-1">
              {/* Stats row */}
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                {spell.action_cost && (
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('entities.spell.actions')}</span>
                    <span className="font-mono text-primary text-sm">{actionCostLabel(spell.action_cost)}</span>
                  </div>
                )}
                {spell.save_stat && (
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('entities.spell.save')}</span>
                    <span className="text-sm capitalize">
                      {locale === 'ru'
                        ? (SAVE_RU_LABELS[spell.save_stat.toLowerCase()] ?? spell.save_stat)
                        : spell.save_stat}
                    </span>
                  </div>
                )}
                {damageDisplay !== '—' && (
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('entities.spell.damage')}</span>
                    <span className="font-mono text-pf-blood text-sm">{damageDisplay}</span>
                  </div>
                )}
                {(spellLoc?.range || spell.range_text) && (
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('statblock.range')}</span>
                    <span className="text-sm">{spellLoc?.range ?? spell.range_text}</span>
                  </div>
                )}
                {spellLoc?.target && (
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('entities.spell.target')}</span>
                    <span className="text-sm">{spellLoc.target}</span>
                  </div>
                )}
                {areaDisplay && (
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('statblock.area')}</span>
                    <span className="text-sm">{areaDisplay}</span>
                  </div>
                )}
                {(spellLoc?.duration || spell.duration_text) && (
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('statblock.duration')}</span>
                    <span className="text-sm">{spellLoc?.duration ?? spell.duration_text}</span>
                  </div>
                )}
                {spellLoc?.time && (
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('entities.spell.cast')}</span>
                    <span className="text-sm">{spellLoc.time}</span>
                  </div>
                )}
                {spellLoc?.cost && (
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('entities.spell.cost')}</span>
                    <span className="text-sm">{spellLoc.cost}</span>
                  </div>
                )}
              </div>

              {/* Traits */}
              {traits.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {traits.map((t) => (
                    <TraitPill key={t} trait={t} />
                  ))}
                </div>
              )}

              {/* Description — when a vendored RU translation exists, render
                  it through SafeHtml (handles Babele @UUID / @Trait /
                  @Damage / @Check tokens + tables / lists / details).
                  Otherwise sanitize the engine EN HTML through the
                  pre-existing token replacement path. */}
              {translation?.textLoc ? (
                <SafeHtml
                  html={translation.textLoc}
                  className="text-[13px] text-foreground/80 leading-relaxed"
                />
              ) : (
                spell.description && (
                  <p className="text-[13px] text-foreground/80 leading-relaxed whitespace-pre-line">
                    {sanitizeFoundryText(spell.description, { itemLevel: spell.rank })}
                  </p>
                )
              )}

              {/* Source */}
              {spell.source_book && (
                <p className="text-xs text-muted-foreground">{t('entities.spell.source')} {spell.source_book}</p>
              )}
            </div>

            <SheetFooter className="p-4 pt-2 border-t border-border/30">
              <SheetClose asChild>
                <Button variant="ghost" size="sm">{t('entities.spell.closePanel')}</Button>
              </SheetClose>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
