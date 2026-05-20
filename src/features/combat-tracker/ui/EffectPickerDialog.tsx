import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { SearchInput } from '@/shared/ui/search-input'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { Skeleton } from '@/shared/ui/skeleton'
import { cn } from '@/shared/lib/utils'
import {
  listSpellEffects,
  getContextEffectsForEncounter,
  applyEffectToCombatant,
  applyGrantedEffects,
} from '@/shared/api'
import type { SpellEffectRow, SpellEffectCategory } from '@/entities/spell-effect'
import { useEffectStore, durationToRounds } from '@/entities/spell-effect'
import { useCombatTrackerStore } from '../model/store'
import { toast } from 'sonner'

interface EffectPickerDialogProps {
  combatantId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EffectPickerDialog({ combatantId, open, onOpenChange }: EffectPickerDialogProps) {
  const { t } = useTranslation('common')

  const TABS = useMemo(
    () => [
      { id: 'spell' as SpellEffectCategory,      label: t('combatTracker.effects.tabSpell') },
      { id: 'alchemical' as SpellEffectCategory, label: t('combatTracker.effects.tabAlchemical') },
      { id: 'other' as SpellEffectCategory,      label: t('combatTracker.effects.tabOther') },
    ],
    [t],
  )
  const [allEffects, setAllEffects] = useState<SpellEffectRow[]>([])
  const [contextEffects, setContextEffects] = useState<SpellEffectRow[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  // no default tab — initial state renders the mascot + help text.
  // User picks a tab (or starts typing in search) to populate the list.
  const [activeTab, setActiveTab] = useState<SpellEffectCategory | null>(null)

  // refetch context when data version bumps (sync, overrides).
  const entityDataVersion = useCombatTrackerStore((s) => s.entityDataVersion)

  useEffect(() => {
    if (!open) return
    const encounterId = useCombatTrackerStore.getState().combatId
    setLoading(true)
    setSearchQuery('')
    setActiveTab(null)
    Promise.all([
      listSpellEffects(),
      encounterId ? getContextEffectsForEncounter(encounterId) : Promise.resolve([]),
    ])
      .then(([all, ctx]) => {
        setAllEffects(all)
        setContextEffects(ctx)
      })
      .finally(() => setLoading(false))
  }, [open, entityDataVersion])

  const isSearching = searchQuery.trim().length > 0

  // Empty search: show context default (fall back to all if context empty).
  // Non-empty search: global search across all effects, name + description.
  const displayed = useMemo(() => {
    if (isSearching) {
      const q = searchQuery.toLowerCase()
      return allEffects.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.description ?? '').toLowerCase().includes(q)
      )
    }
    return contextEffects.length > 0 ? contextEffects : allEffects
  }, [isSearching, searchQuery, allEffects, contextEffects])

  // pre-compute per-tab buckets so counts on tab strip and the rendered
  // list are always consistent with the same source set.
  const byCategory = useMemo(() => {
    const acc: Record<SpellEffectCategory, SpellEffectRow[]> = {
      spell: [],
      alchemical: [],
      other: [],
    }
    for (const e of displayed) acc[e.category].push(e)
    return acc
  }, [displayed])

  // no default tab. Welcome mascot shows until user acts.
  // When searching with no tab selected we show results flat across all
  // categories so the user isn't forced to click a tab to see hits.
  const rows: SpellEffectRow[] =
    activeTab ? byCategory[activeTab]
    : isSearching ? displayed
    : []
  const showMascotWelcome = !isSearching && activeTab === null && !loading
  const showFallbackHint =
    !isSearching && contextEffects.length === 0 && !loading

  const handleSelect = useCallback(
    async (effect: SpellEffectRow) => {
      const encounterId = useCombatTrackerStore.getState().combatId
      if (!encounterId) return
      const remainingTurns = durationToRounds(effect.duration_json)
      try {
        const newId = await applyEffectToCombatant(encounterId, combatantId, effect.id, remainingTurns)
        useEffectStore.getState().addEffect({
          id: newId,
          combatantId,
          effectId: effect.id,
          effectName: effect.name,
          remainingTurns,
          rulesJson: effect.rules_json,
          durationJson: effect.duration_json,
          description: effect.description,
          level: effect.level,
        })

        // auto-apply any same-pack GrantItem children the parent declares.
        // Cascade-delete is handled by the 0034 FK, so no teardown bookkeeping
        // is needed here.
        const granted = await applyGrantedEffects(
          encounterId,
          combatantId,
          newId,
          effect.rules_json,
          remainingTurns,
        )
        for (const g of granted) {
          useEffectStore.getState().addEffect({
            id: g.id,
            combatantId,
            effectId: g.effectId,
            effectName: g.name,
            remainingTurns: g.remainingTurns,
            rulesJson: g.rulesJson,
            durationJson: g.durationJson,
            description: g.description,
            level: g.level,
          })
        }
        const suffix =
          granted.length > 0 ? ` (+${granted.length} granted)` : ''
        toast(`Applied ${effect.name}${suffix}`)
        onOpenChange(false)
      } catch {
        toast(`Failed to apply ${effect.name}`)
      }
    },
    [combatantId, onOpenChange]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-sm">{t('combatTracker.effects.title')}</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-2">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              contextEffects.length > 0 && !isSearching
                ? t('combatTracker.effects.searchAllPlaceholder')
                : t('combatTracker.effects.searchPlaceholder')
            }
            aria-label={t('combatTracker.effects.ariaSearch')}
            autoFocus
            className="h-8 text-xs"
          />
          {showFallbackHint && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              {t('combatTracker.effects.noContext')} ({allEffects.length} effects).
            </p>
          )}
        </div>

        {/* Tab strip */}
        <div className="flex items-stretch border-y border-border/40">
          {TABS.map((t) => {
            const count = byCategory[t.id].length
            const isActive = activeTab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors border-r border-border/40 last:border-r-0',
                  isActive
                    ? 'bg-primary/10 text-primary border-b-2 border-b-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/20'
                )}
              >
                <span>{t.label}</span>
                <span className={cn('font-mono text-[10px]', isActive ? 'text-primary/80' : 'text-muted-foreground/70')}>
                  ({count})
                </span>
              </button>
            )
          })}
        </div>

        <ScrollArea className="h-[28rem] px-2">
          {loading ? (
            <div className="space-y-1 px-2 py-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : showMascotWelcome ? (
            <WelcomeState />
          ) : rows.length === 0 ? (
            <EmptyState
              isSearching={isSearching}
              tabLabel={activeTab ? TABS.find((t) => t.id === activeTab)!.label : ''}
            />
          ) : (
            <div className="space-y-1 py-2">
              {rows.map((effect) => {
                const desc = effect.description ? effect.description.slice(0, 160) : null
                return (
                  <div
                    key={effect.id}
                    role="button"
                    tabIndex={0}
                    className="flex flex-col px-3 py-2 rounded-md cursor-pointer hover:bg-accent/30 transition-colors border border-border/20 bg-card/30"
                    onClick={() => handleSelect(effect)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSelect(effect)}
                  >
                    <span className="text-sm font-semibold">{effect.name}</span>
                    {desc && (
                      <span className="text-xs text-muted-foreground line-clamp-2 leading-snug">{desc}</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function WelcomeState() {
  const { t } = useTranslation('common')
  return (
    <div className="flex flex-col min-h-full items-center justify-center gap-3 py-8 px-4 text-center">
      <img
        src="/mascot/placeholder_maid.png"
        alt="Pathmaid greeter"
        className="h-56 min-h-full w-auto drop-shadow-lg"
      />
      <div className="space-y-1">
        <p className="text-sm font-semibold">{t('combatTracker.effects.welcomeTitle')}</p>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          {t('combatTracker.effects.welcomeDesc')}
        </p>
      </div>
    </div>
  )
}

function EmptyState({ isSearching, tabLabel }: { isSearching: boolean; tabLabel: string }) {
  const { t } = useTranslation('common')
  return (
    <div className="flex flex-col min-h-full items-center justify-center gap-3 py-8 px-4 text-center">
      <img
        src="/mascot/placeholder_maid.png"
        alt="No effects here"
        className="h-56  min-h-full w-auto opacity-90 drop-shadow-lg"
      />
      <div className="space-y-1">
        <p className="text-sm font-semibold">
          {isSearching
            ? t('combatTracker.effects.emptySearch')
            : t('combatTracker.effects.emptyCategory', { category: tabLabel.toLowerCase() })}
        </p>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          {isSearching
            ? t('combatTracker.effects.emptySearchHint')
            : t('combatTracker.effects.emptyTabsHint')}
        </p>
      </div>
    </div>
  )
}
