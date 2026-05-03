import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible'
import { ChevronDown, Flame, BookMarked, type LucideIcon } from 'lucide-react'
import { type SpellcastingSection, groupPreparedSpells, dedupeSpontaneousSpells } from '@/entities/spell'
import { traditionColor, rankLabel } from '../lib/spellcasting-helpers'
import { useCurrentLocale } from '@/shared/i18n/use-current-locale'
import { getTraitLabel } from '@/shared/i18n/pf2e-content'
import { SpellCard } from './SpellCard'

/**
 * Read-only spellcasting renderer for contexts without combat state
 * (bestiary preview, builder preview, creature modals).
 *
 * Rank tabs: ranks render as a horizontal tab strip with slot counters;
 * only the active rank materializes its spell cards. Per-card collapse
 * default lives in SpellCard (open=false on mount). Live-combat callers
 * should pass `<SpellcastingBlock>` via `CreatureStatBlock.renderSpellcasting`
 * instead.
 */
export function SpellListPreview({ section, creatureName }: {
  section: SpellcastingSection
  creatureName?: string
}) {
  const { t } = useTranslation()
  const locale = useCurrentLocale()
  // Filter empty rank buckets — Foundry sometimes seeds 0..10 even when only
  // a couple of ranks have actual spells.
  const ranksWithSpells = useMemo(
    () => section.spellsByRank.filter((r) => r.spells.length > 0),
    [section.spellsByRank],
  )
  const [activeRank, setActiveRank] = useState<number | null>(
    ranksWithSpells.length > 0 ? ranksWithSpells[0].rank : null,
  )
  const activeBucket = useMemo(
    () => ranksWithSpells.find((r) => r.rank === activeRank) ?? null,
    [ranksWithSpells, activeRank],
  )
  // Mirror the combat-view dedup/grouping rules so a prepared caster's
  // "5× Heal" reads as one row, and spontaneous duplicates collapse.
  // Cantrips/focus stay verbatim — their per-row identity matters.
  const displayRows = useMemo(() => {
    if (!activeBucket) return []
    if (activeBucket.rank === 0 || section.castType === 'focus') {
      return activeBucket.spells.map((s) => ({
        name: s.name,
        foundryId: s.foundryId,
        count: 1,
      }))
    }
    if (section.castType === 'prepared') {
      const slots = activeBucket.spells.map((s, i) => ({
        name: s.name,
        foundryId: s.foundryId,
        slotKey: `${s.name}#${i}`,
      }))
      return groupPreparedSpells(slots).map((g) => ({
        name: g.name,
        foundryId: g.foundryId,
        count: g.totalCount,
      }))
    }
    return dedupeSpontaneousSpells(activeBucket.spells).map((s) => ({
      name: s.name,
      foundryId: s.foundryId,
      count: 1,
    }))
  }, [activeBucket, section.castType])
  // Static cast-type cue mirrors the combat-mode SpellRow icons (Flame for slot
  // consumers, BookMarked for prepared decrement) but без onClick/<button> —
  // bestiary preview is read-only.
  const castIndicator = useMemo<{ Icon: LucideIcon; titleKey: string } | null>(() => {
    switch (section.castType) {
      case 'prepared':
        return { Icon: BookMarked, titleKey: 'spellcastingIndicator.prepared' }
      case 'spontaneous':
        return { Icon: Flame, titleKey: 'spellcastingIndicator.spontaneous' }
      case 'innate':
        return { Icon: Flame, titleKey: 'spellcastingIndicator.innate' }
      case 'focus':
        return { Icon: Flame, titleKey: 'spellcastingIndicator.focus' }
      default:
        return null
    }
  }, [section.castType])
  // Capital-cased alias so JSX treats the value as a component, not an HTML tag.
  const IndicatorIcon = castIndicator?.Icon ?? null
  const indicatorTitle = castIndicator ? t(castIndicator.titleKey) : ''
  return (
    <Collapsible defaultOpen={false}>
      <div className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-primary/40">
        <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="font-semibold text-sm text-foreground">{t('statblock.spellcasting')}</span>
          <span className={cn("px-1.5 py-0.5 text-[10px] rounded border uppercase tracking-wider font-semibold", traditionColor(section.tradition))}>
            {getTraitLabel(section.tradition.toLowerCase(), locale)} {getTraitLabel(section.castType.toLowerCase(), locale)}
          </span>
          <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="px-4 pb-3 pt-2 space-y-3">
          <div className="flex gap-4 text-sm">
            {section.spellDc > 0 && (
              <span className="text-muted-foreground">{t('statblock.dc')}{' '}
                <span className="font-mono font-bold text-primary">{section.spellDc}</span>
              </span>
            )}
            {section.spellAttack !== 0 && (
              <span className="text-muted-foreground">{t('statblock.attack')}{' '}
                <span className="font-mono font-bold text-primary">
                  {section.spellAttack >= 0 ? '+' : ''}{section.spellAttack}
                </span>
              </span>
            )}
          </div>

          {ranksWithSpells.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {ranksWithSpells.map((r) => {
                const label = r.rank === 0 ? t('statblock.cantrips') : rankLabel(r.rank, t)
                const isActive = r.rank === activeRank
                return (
                  <button
                    key={r.rank}
                    type="button"
                    onClick={() => setActiveRank(r.rank)}
                    className={cn(
                      'flex items-center gap-1 px-2 py-0.5 rounded text-xs uppercase tracking-wider font-semibold border transition-colors',
                      isActive
                        ? 'bg-primary/20 text-primary border-primary/40'
                        : 'bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary/80 hover:text-foreground',
                    )}
                  >
                    <span>{label}</span>
                    {r.rank > 0 && r.slots > 0 && (
                      <span className="text-[10px] text-muted-foreground/80">{r.slots}</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {activeBucket && (
            <div className="space-y-1">
              {displayRows.map((row, i) => (
                <div key={`${row.name}-${i}`} className="flex items-center gap-1.5">
                  {IndicatorIcon && activeBucket.rank > 0 && (
                    <IndicatorIcon
                      className="w-3.5 h-3.5 shrink-0 text-muted-foreground"
                      aria-label={indicatorTitle}
                    />
                  )}
                  <div className="flex-1">
                    <SpellCard
                      name={row.name}
                      foundryId={row.foundryId}
                      source={creatureName}
                      castRank={activeBucket.rank}
                    />
                  </div>
                  {row.count > 1 && (
                    <span className="shrink-0 px-1.5 py-0.5 text-[10px] rounded font-mono tabular-nums text-muted-foreground bg-muted/40 border border-border/40">
                      × {row.count}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
