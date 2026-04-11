import { useState, useEffect, useCallback, useMemo } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { ClickableFormula } from '@/shared/ui/clickable-formula'
import { damageTypeColor } from '@/shared/lib/damage-colors'
import { getSpellById, getSpellByName } from '@/shared/api'
import type { SpellRow } from '@/entities/spell'
import { stripHtml } from '@/shared/lib/html'
import { actionCostLabel, resolveFoundryTokensForSpell } from '../lib/spellcasting-helpers'

export function SpellCard({ foundryId, name, source, combatId }: {
  foundryId: string | null
  name: string
  source?: string
  combatId?: string
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

  const traditions: string[] = useMemo(
    () => (spell?.traditions ? JSON.parse(spell.traditions) : []),
    [spell?.traditions],
  )
  const traits: string[] = useMemo(
    () => (spell?.traits ? JSON.parse(spell.traits) : []),
    [spell?.traits],
  )
  const parsedArea = useMemo(() => {
    if (!spell?.area) return null
    try {
      const a = JSON.parse(spell.area) as { type?: string; value?: number }
      return a.value ? { type: a.type, value: a.value } : null
    } catch { return null }
  }, [spell?.area])
  const parsedDamage = useMemo(() => {
    if (!spell?.damage) return null
    try {
      const dmg = JSON.parse(spell.damage) as Record<string, { formula?: string; damage?: string; damageType?: string; type?: string }>
      const parts = Object.values(dmg)
        .map((d) => ({ formula: d.formula ?? d.damage ?? null, type: d.damageType ?? d.type ?? null }))
        .filter((d) => d.formula)
      return parts.length > 0 ? parts : null
    } catch { return null }
  }, [spell?.damage])

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
        <span className="font-medium">{name}</span>
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
          {/* Description */}
          {spell.description && (
            <p className="text-xs text-foreground/75 leading-relaxed line-clamp-4">
              {stripHtml(resolveFoundryTokensForSpell(spell.description))}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
