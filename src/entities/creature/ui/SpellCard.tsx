import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { ClickableFormula } from '@/shared/ui/clickable-formula'
import { CritButton } from '@/shared/ui/crit-button'
import { TraitPill } from '@/shared/ui/trait-pill'
import { damageTypeColor } from '@/shared/lib/damage-colors'
import { getSpellById, getSpellByName } from '@/shared/api'
import type { SpellRow } from '@/entities/spell'
import { heightenFormula } from '@engine'
import { actionCostLabel, resolveFoundryTokensForSpell } from '../lib/spellcasting-helpers'
import { parseJsonArray, parseJsonOrNull } from '@/shared/lib/json'
import { useContentTranslation } from '@/shared/i18n/use-content-translation'
import { useCurrentLocale } from '@/shared/i18n/use-current-locale'
import { getTraitLabel } from '@/shared/i18n/pf2e-content'
import { SafeHtml } from '@/shared/lib/safe-html'
import { extractHeightening, applyHeightenedScalings } from '@/entities/spell/lib/heightened-text'

type IntervalHeighten = { type: 'interval'; perRanks: number; damage: Record<string, string> }
type FixedHeightenDamageEntry = { formula?: string; type?: string; damageType?: string; category?: string | null }
type FixedHeightenLevel = { damage?: Record<string, FixedHeightenDamageEntry> }
type FixedHeighten = { type: 'fixed'; levels: Record<string, FixedHeightenLevel> }
type HeightenSpec = IntervalHeighten | FixedHeighten

export function SpellCard({ foundryId, name, source, combatId, castRank, castConsumed }: {
  foundryId: string | null
  name: string
  source?: string
  combatId?: string
  /** Rank the caster has this spell prepared at / is casting it as. When > spell.rank
   *  and the spell has an interval heighten spec, damage formulas scale automatically.
   *  PF2e rules: https://2e.aonprd.com/Rules.aspx?ID=2225 */
  castRank?: number
  /** 62-02: prepared spells marked consumed render name struck-through. */
  castConsumed?: boolean
}) {
  const { t } = useTranslation()
  const locale = useCurrentLocale()
  // Collapsed by default — long preview lists become unscrollable when every
  // card auto-expands. DM clicks the row to peek; auto-load fires once on
  // first open via handleToggle below.
  const [open, setOpen] = useState(false)
  const [spell, setSpell] = useState<SpellRow | null>(null)
  const [loading, setLoading] = useState(false)
  // Spell translation overlay — pulled from `translations` table seeded by
  // pf2-locale-ru pack ingest. Returns localized name + structured.description
  // when present; otherwise renders English-driven engine values.
  const { data: spellTranslation } = useContentTranslation('spell', name, null)
  const localizedName = spellTranslation?.nameLoc ?? name
  const localizedDescriptionHtml = spellTranslation?.textLoc ?? null

  const loadSpell = useCallback(async () => {
    if (spell || loading) return
    setLoading(true)
    try {
      let data: SpellRow | null = null
      if (foundryId) {
        data = await getSpellById(foundryId)
      }
      if (!data) {
        data = await getSpellByName(name)
      }
      setSpell(data)
    } finally {
      setLoading(false)
    }
  }, [foundryId, name, spell, loading])

  // Auto-load on mount so the default-open card actually has content.
  useEffect(() => {
    if (open && !spell && !loading) {
      loadSpell()
    }
  }, [])

  async function handleToggle() {
    if (!open) await loadSpell()
    setOpen((v) => !v)
  }

  const traditions = useMemo(() => parseJsonArray(spell?.traditions), [spell?.traditions])
  const traits = useMemo(() => parseJsonArray(spell?.traits), [spell?.traits])
  const parsedArea = useMemo(() => {
    const a = parseJsonOrNull<{ type?: string; value?: number }>(spell?.area)
    return a?.value ? { type: a.type, value: a.value } : null
  }, [spell?.area])
  const heighten = useMemo(
    () => parseJsonOrNull<HeightenSpec>(spell?.heightened_json),
    [spell?.heightened_json],
  )

  const description = useMemo(() => {
    if (!spell) return { mainHtml: '', blocks: [] }
    const baseRank = spell.rank
    const effectiveRank = castRank ?? baseRank
    const sourceHtml = localizedDescriptionHtml
      ?? (spell.description
        ? resolveFoundryTokensForSpell(spell.description, { itemLevel: effectiveRank })
        : null)
    if (!sourceHtml) return { mainHtml: '', blocks: [] }
    const extracted = extractHeightening(sourceHtml)
    const scaledMain = applyHeightenedScalings(extracted.mainHtml, extracted.blocks, effectiveRank, baseRank)
    return { mainHtml: scaledMain, blocks: extracted.blocks }
  }, [spell, castRank, localizedDescriptionHtml])

  const parsedDamage = useMemo(() => {
    type DamageEntry = { formula?: string; damage?: string; damageType?: string; type?: string; kinds?: string[] }
    const dmg = parseJsonOrNull<Record<string, DamageEntry>>(spell?.damage)
    if (!dmg || !spell) return null
    const baseRank = spell.rank
    const effectiveRank = castRank ?? baseRank

    // Fixed heighten: at specified levels, the `damage` object REPLACES base
    // damage entirely (magic-missile / acid-splash style). Use the highest
    // level key ≤ effectiveRank (so casterLevel 14 → ceil/2=7 picks levels[7]).
    let effectiveDamage: Record<string, DamageEntry> = dmg
    if (heighten?.type === 'fixed' && effectiveRank > baseRank) {
      const levelKeys = Object.keys(heighten.levels)
        .map(Number)
        .filter((k) => Number.isFinite(k) && k <= effectiveRank)
        .sort((a, b) => b - a)
      const pick = levelKeys[0]
      if (pick !== undefined) {
        const lvlDamage = heighten.levels[String(pick)]?.damage
        if (lvlDamage && Object.keys(lvlDamage).length > 0) {
          effectiveDamage = lvlDamage as Record<string, DamageEntry>
        }
      }
    }

    const parts = Object.entries(effectiveDamage)
      .map(([key, d]) => {
        const rawFormula = d.formula ?? d.damage ?? null
        if (!rawFormula) return null
        // Interval heighten additively scales each damage key.
        let formula = rawFormula
        if (
          heighten?.type === 'interval' &&
          effectiveRank > baseRank &&
          heighten.damage[key]
        ) {
          formula = heightenFormula(
            rawFormula,
            { perRanks: heighten.perRanks, add: heighten.damage[key] },
            effectiveRank,
            baseRank,
          )
        }
        return {
          formula,
          type: d.damageType ?? d.type ?? null,
          kinds: d.kinds ?? null,
        }
      })
      .filter((d): d is { formula: string; type: string | null; kinds: string[] | null } => d !== null)
    return parts.length > 0 ? parts : null
  }, [spell, heighten, castRank])

  // Damage block dispatch: pure-healing spells (Heal, Breath of Life) carry
  // `damage.kinds: ["healing"]` in Foundry source. Render them as positive
  // restoration — green formula, "Healing:" label, no crit button (healing
  // does not crit). Mixed-kind spells (rare) get a combined label so the DM
  // sees both intents at once.
  const damageLabel = useMemo(() => {
    if (!parsedDamage || parsedDamage.length === 0) return null
    const allKinds = parsedDamage.map((p) => p.kinds ?? [])
    const hasHealing = allKinds.some((k) => k.includes('healing'))
    const hasDamage = allKinds.some((k) => k.includes('damage')) || allKinds.every((k) => k.length === 0)
    if (hasHealing && !hasDamage) return { key: 'statblock.healing', isHealingOnly: true }
    if (hasHealing && hasDamage) return { key: 'statblock.damageHealing', isHealingOnly: false }
    return { key: 'statblock.damage', isHealingOnly: false }
  }, [parsedDamage])

  return (
    <div className="rounded border border-border/30 bg-secondary/30 overflow-hidden">
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-1.5 px-2 py-1 text-sm text-left hover:bg-secondary/60 transition-colors"
      >
        {open
          ? <ChevronDown className="w-3 h-3 shrink-0 text-muted-foreground" />
          : <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground" />
        }
        <span className={cn('font-medium', castConsumed && 'line-through text-muted-foreground/60')}>{localizedName}</span>
        {loading && <span className="text-xs text-muted-foreground ml-auto">…</span>}
      </button>

      {open && spell && (
        <div className="px-3 pb-2 pt-1 space-y-1.5 border-t border-border/30">
          {/* Meta row */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            {spell.action_cost && (
              <span className="font-mono text-primary">{actionCostLabel(spell.action_cost)}</span>
            )}
            {spell.range_text && (
              <span className="text-muted-foreground">{t('statblock.range')}: <span className="text-foreground">{spell.range_text}</span></span>
            )}
            {parsedArea && (
              <span className="text-muted-foreground">{t('statblock.area')}: <span className="text-foreground">{t('statblock.areaTemplate', { value: parsedArea.value, type: parsedArea.type })}</span></span>
            )}
            {spell.duration_text && (
              <span className="text-muted-foreground">{t('statblock.duration')}: <span className="text-foreground">{spell.duration_text}</span></span>
            )}
            {spell.save_stat && (
              <span className="text-muted-foreground">{t('statblock.save')}: <span className="text-foreground capitalize">{getTraitLabel(spell.save_stat.toLowerCase(), locale)}</span></span>
            )}
          </div>
          {/* Damage / Healing — label + colors driven by damageLabel dispatch. */}
          {parsedDamage && (
            <p className="text-xs flex flex-wrap items-center gap-1">
              <span className="text-muted-foreground">{t(damageLabel?.key ?? 'statblock.damage')}:</span>
              {parsedDamage.map((d, i) => (
                <span key={i} className="flex items-center gap-0.5">
                  {i > 0 && <span className="text-muted-foreground">+</span>}
                  <ClickableFormula
                    formula={d.formula!}
                    label={`${localizedName} ${t(damageLabel?.key ?? 'statblock.damage').toLowerCase()}`}
                    source={source}
                    combatId={combatId}
                    className={cn("text-xs", damageLabel?.isHealingOnly && "text-green-400")}
                  />
                  {d.type && (
                    <span className={cn("font-mono", damageLabel?.isHealingOnly ? "text-green-400" : damageTypeColor(d.type))}>
                      {getTraitLabel(d.type.toLowerCase(), locale)}
                    </span>
                  )}
                </span>
              ))}
              {!damageLabel?.isHealingOnly && parsedDamage[0]?.formula && (
                <CritButton
                  formula={parsedDamage[0].formula}
                  label={`${localizedName} crit damage`}
                  source={source}
                  combatId={combatId}
                  className="ml-auto h-6 px-2 text-[10px]"
                />
              )}
            </p>
          )}
          {/* Traits — route through TraitPill so dictionary lookup is consistent
              with statblock header and ability traits. */}
          {(traits.length > 0 || traditions.length > 0) && (
            <div className="flex flex-wrap gap-1">
              {[...traditions, ...traits].map((trait) => (
                <TraitPill key={trait} trait={trait} />
              ))}
            </div>
          )}
          {/* Description — heightened blocks extracted out; numeric scalings
              (Hardness etc.) applied when castRank > base rank. */}
          {description.mainHtml && (
            <SafeHtml
              html={description.mainHtml}
              className="text-xs text-foreground/75 leading-relaxed"
            />
          )}
          {description.blocks.length > 0 && (
            <div className="mt-1 rounded border border-pf-gold/30 bg-pf-gold/5 p-2 space-y-1">
              {description.blocks.map((b, i) => (
                <p key={i} className="text-xs leading-snug">
                  <span className="font-mono font-semibold text-pf-gold mr-1.5">
                    {t('entities.spell.heightenedLabel', { defaultValue: 'Heightened' })} (+{b.step})
                  </span>
                  <span className="text-foreground/85">{b.text}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
