import { useState, useEffect, useMemo } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetFooter } from '@/shared/ui/sheet'
import { Button } from '@/shared/ui/button'
import { getSpellById } from '@/shared/api'
import type { SpellRow } from '@/shared/api'
import { cn } from '@/shared/lib/utils'
import { sanitizeFoundryText } from '@/shared/lib/foundry-tokens'
import { SafeHtml } from '@/shared/lib/safe-html'
import { NoTranslationBadge } from '@/shared/ui/no-translation-badge'
import { useContentTranslation, useCurrentLocale } from '@/shared/i18n'
import type { SpellStructuredLoc } from '@/shared/i18n/pf2e-content/lib'
import { TRADITION_COLORS, actionCostLabel, rankLabel, parseDamageDisplay, parseAreaDisplay } from '../lib/helpers'
import { parseJsonArray } from '@/shared/lib/json'

interface SpellReferenceDrawerProps {
  spellId: string | null
  onClose: () => void
}

export function SpellReferenceDrawer({ spellId, onClose }: SpellReferenceDrawerProps) {
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
                {translation?.nameLoc ?? spell.name}
              </SheetTitle>
              <div className="flex items-center flex-wrap gap-2 mt-1">
                <span className="text-xs text-muted-foreground">{rankLabel(spell.rank)}</span>
                {traditions.map((t) => (
                  <span
                    key={t}
                    className={cn(
                      'px-1.5 py-0.5 text-[10px] rounded border uppercase tracking-wider font-semibold',
                      TRADITION_COLORS[t] ?? 'bg-secondary text-secondary-foreground border-border'
                    )}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </SheetHeader>

            <div className="p-4 space-y-4 flex-1">
              {/* Stats row */}
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                {spell.action_cost && (
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Actions</span>
                    <span className="font-mono text-primary text-sm">{actionCostLabel(spell.action_cost)}</span>
                  </div>
                )}
                {spell.save_stat && (
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Save</span>
                    <span className="text-sm capitalize">{spell.save_stat}</span>
                  </div>
                )}
                {damageDisplay !== '—' && (
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Damage</span>
                    <span className="font-mono text-pf-blood text-sm">{damageDisplay}</span>
                  </div>
                )}
                {(spellLoc?.range || spell.range_text) && (
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Range</span>
                    <span className="text-sm">{spellLoc?.range ?? spell.range_text}</span>
                  </div>
                )}
                {spellLoc?.target && (
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Target</span>
                    <span className="text-sm">{spellLoc.target}</span>
                  </div>
                )}
                {areaDisplay && (
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Area</span>
                    <span className="text-sm">{areaDisplay}</span>
                  </div>
                )}
                {(spellLoc?.duration || spell.duration_text) && (
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Duration</span>
                    <span className="text-sm">{spellLoc?.duration ?? spell.duration_text}</span>
                  </div>
                )}
                {spellLoc?.time && (
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Cast</span>
                    <span className="text-sm">{spellLoc.time}</span>
                  </div>
                )}
                {spellLoc?.cost && (
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Cost</span>
                    <span className="text-sm">{spellLoc.cost}</span>
                  </div>
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
                <p className="text-xs text-muted-foreground">Source: {spell.source_book}</p>
              )}
            </div>

            <SheetFooter className="p-4 pt-2 border-t border-border/30">
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
