import { useState, useEffect, useCallback, useMemo } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { ClickableFormula } from '@/shared/ui/clickable-formula'
import { damageTypeColor } from '@/shared/lib/damage-colors'
import { getSpellById, getSpellByName } from '@/shared/api'
import type { SpellRow } from '@/entities/spell'
import { stripHtml } from '@/shared/lib/html'
import { heightenFormula } from '@engine'
import { actionCostLabel, resolveFoundryTokensForSpell } from '../lib/spellcasting-helpers'
import { parseJsonArray, parseJsonOrNull } from '@/shared/lib/json'

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
  const [open, setOpen] = useState(true)
  const [spell, setSpell] = useState<SpellRow | null>(null)
  const [loading, setLoading] = useState(false)

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

  const parsedDamage = useMemo(() => {
    type DamageEntry = { formula?: string; damage?: string; damageType?: string; type?: string }
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
        }
      })
      .filter((d): d is { formula: string; type: string | null } => d !== null)
    return parts.length > 0 ? parts : null
  }, [spell, heighten, castRank])

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
        <span className={cn('font-medium', castConsumed && 'line-through text-muted-foreground/60')}>{name}</span>
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
              <span className="text-muted-foreground">Range: <span className="text-foreground">{spell.range_text}</span></span>
            )}
            {parsedArea && (
              <span className="text-muted-foreground">Area: <span className="text-foreground">{parsedArea.value}-foot {parsedArea.type}</span></span>
            )}
            {spell.duration_text && (
              <span className="text-muted-foreground">Duration: <span className="text-foreground">{spell.duration_text}</span></span>
            )}
            {spell.save_stat && (
              <span className="text-muted-foreground">Save: <span className="text-foreground capitalize">{spell.save_stat}</span></span>
            )}
          </div>
          {/* Damage */}
          {parsedDamage && (
            <p className="text-xs flex flex-wrap items-center gap-1">
              <span className="text-muted-foreground">Damage:</span>
              {parsedDamage.map((d, i) => (
                <span key={i} className="flex items-center gap-0.5">
                  {i > 0 && <span className="text-muted-foreground">+</span>}
                  <ClickableFormula
                    formula={d.formula!}
                    label={`${name} damage`}
                    source={source}
                    combatId={combatId}
                    className="text-xs"
                  />
                  {d.type && <span className={cn("font-mono", damageTypeColor(d.type))}>{d.type}</span>}
                </span>
              ))}
            </p>
          )}
          {/* Traits */}
          {(traits.length > 0 || traditions.length > 0) && (
            <div className="flex flex-wrap gap-1">
              {[...traditions, ...traits].map((t) => (
                <span key={t} className="px-1 py-0.5 text-[10px] rounded bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">{t}</span>
              ))}
            </div>
          )}
          {/* Description — full body, no clamp so DMs can read long spell
              effects (e.g. Charm, Dominate) without clipping. */}
          {spell.description && (
            <p className="text-xs text-foreground/75 leading-relaxed whitespace-pre-line">
              {stripHtml(resolveFoundryTokensForSpell(spell.description, { itemLevel: castRank ?? spell.rank }))}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
