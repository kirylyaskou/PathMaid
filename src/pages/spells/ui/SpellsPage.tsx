import { useState, useEffect, useCallback } from 'react'
import { Search, BookOpen } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { Separator } from '@/shared/ui/separator'
import { searchSpells } from '@/shared/api'
import type { SpellRow } from '@/shared/api'
import { cn } from '@/shared/lib/utils'

const TRADITIONS = ['arcane', 'divine', 'occult', 'primal'] as const
const RANKS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const

const TRADITION_COLORS: Record<string, string> = {
  arcane:  'bg-blue-500/20 text-blue-300 border-blue-500/40',
  divine:  'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  occult:  'bg-purple-500/20 text-purple-300 border-purple-500/40',
  primal:  'bg-green-500/20 text-green-300 border-green-500/40',
}

function actionCostLabel(cost: string | null): string {
  if (!cost) return ''
  if (cost === 'free') return '◇'
  if (cost === 'reaction') return '↺'
  const n = parseInt(cost)
  if (n === 1) return '◆'
  if (n === 2) return '◆◆'
  if (n === 3) return '◆◆◆'
  return cost
}

function rankLabel(rank: number) {
  return rank === 0 ? 'Cantrip' : `Rank ${rank}`
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

function SpellCard({ spell, expanded, onToggle }: {
  spell: SpellRow
  expanded: boolean
  onToggle: () => void
}) {
  const traditions: string[] = spell.traditions ? JSON.parse(spell.traditions) : []
  const traits: string[] = spell.traits ? JSON.parse(spell.traits) : []

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
        <span className="font-semibold text-sm flex-1">{spell.name}</span>
        {spell.action_cost && (
          <span className="font-mono text-primary text-sm shrink-0">{actionCostLabel(spell.action_cost)}</span>
        )}
        <span className="text-xs text-muted-foreground shrink-0">{rankLabel(spell.rank)}</span>
      </div>

      {/* Tradition badges — always visible */}
      {traditions.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 pb-2">
          {traditions.map((t) => (
            <span
              key={t}
              className={cn("px-1.5 py-0.5 text-[10px] rounded border uppercase tracking-wider font-semibold", TRADITION_COLORS[t] ?? 'bg-secondary text-secondary-foreground border-border')}
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-border/30 pt-2">
          {/* Meta */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {spell.range_text && (
              <span className="text-muted-foreground">Range: <span className="text-foreground">{spell.range_text}</span></span>
            )}
            {spell.area && (() => {
              const a = JSON.parse(spell.area) as { type?: string; value?: number }
              return a.value
                ? <span className="text-muted-foreground">Area: <span className="text-foreground">{a.value}-foot {a.type}</span></span>
                : null
            })()}
            {spell.duration_text && (
              <span className="text-muted-foreground">Duration: <span className="text-foreground">{spell.duration_text}</span></span>
            )}
            {spell.save_stat && (
              <span className="text-muted-foreground">Save: <span className="text-foreground capitalize">{spell.save_stat}</span></span>
            )}
            {spell.source_book && (
              <span className="text-muted-foreground">Source: <span className="text-foreground">{spell.source_book}</span></span>
            )}
          </div>

          {/* Damage */}
          {spell.damage && (() => {
            const dmg = JSON.parse(spell.damage) as Record<string, { formula?: string; damage?: string; damageType?: string; type?: string }>
            const parts = Object.values(dmg)
              .map((d) => `${d.formula ?? d.damage ?? '?'} ${d.damageType ?? d.type ?? ''}`.trim())
              .filter(Boolean)
            return parts.length > 0
              ? <p className="text-xs"><span className="text-muted-foreground">Damage: </span><span className="font-mono text-pf-blood">{parts.join(' + ')}</span></p>
              : null
          })()}

          {/* All traits */}
          {traits.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {traits.map((t) => (
                <span key={t} className="px-1 py-0.5 text-[10px] rounded bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">{t}</span>
              ))}
            </div>
          )}

          {/* Description */}
          {spell.description && (
            <p className="text-xs text-foreground/75 leading-relaxed">
              {stripHtml(spell.description)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export function SpellsPage() {
  const [query, setQuery] = useState('')
  const [selectedTradition, setSelectedTradition] = useState<string | null>(null)
  const [selectedRank, setSelectedRank] = useState<number | null>(null)
  const [spells, setSpells] = useState<SpellRow[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async (q: string, tradition: string | null, rank: number | null) => {
    setLoading(true)
    try {
      const results = await searchSpells(q, rank ?? undefined, tradition ?? undefined)
      setSpells(results)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load + debounced search
  useEffect(() => {
    const timer = setTimeout(() => load(query, selectedTradition, selectedRank), 200)
    return () => clearTimeout(timer)
  }, [query, selectedTradition, selectedRank, load])

  function toggleTradition(t: string) {
    setSelectedTradition((prev) => (prev === t ? null : t))
  }

  function toggleRank(r: number) {
    setSelectedRank((prev) => (prev === r ? null : r))
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="p-3 border-b border-border/50 space-y-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search spells…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Tradition filter */}
        <div className="flex flex-wrap gap-1.5">
          {TRADITIONS.map((t) => (
            <button
              key={t}
              onClick={() => toggleTradition(t)}
              className={cn(
                "px-2 py-0.5 text-[11px] rounded border uppercase tracking-wider font-semibold transition-opacity",
                TRADITION_COLORS[t],
                selectedTradition && selectedTradition !== t && "opacity-30"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Rank filter */}
        <div className="flex flex-wrap gap-1">
          {RANKS.map((r) => (
            <button
              key={r}
              onClick={() => toggleRank(r)}
              className={cn(
                "w-7 h-6 text-xs rounded border transition-colors font-mono",
                selectedRank === r
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary/50 text-muted-foreground border-border/40 hover:border-border"
              )}
            >
              {r === 0 ? 'C' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <div className="px-3 py-1.5 shrink-0 border-b border-border/30">
        <p className="text-xs text-muted-foreground">
          {loading ? 'Searching…' : `${spells.length} spell${spells.length !== 1 ? 's' : ''}`}
          {(selectedTradition || selectedRank !== null) && (
            <button
              onClick={() => { setSelectedTradition(null); setSelectedRank(null) }}
              className="ml-2 text-primary hover:underline"
            >
              clear filters
            </button>
          )}
        </p>
      </div>

      {/* Spell list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {spells.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <BookOpen className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">
              {query || selectedTradition || selectedRank !== null
                ? 'No spells match the filters'
                : 'Run sync to import spells'}
            </p>
          </div>
        )}
        {spells.map((spell) => (
          <SpellCard
            key={spell.id}
            spell={spell}
            expanded={expandedId === spell.id}
            onToggle={() => setExpandedId((prev) => (prev === spell.id ? null : spell.id))}
          />
        ))}
      </div>
    </div>
  )
}
