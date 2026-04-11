import { useState, useEffect, useRef } from 'react'
import { cn } from '@/shared/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { SearchInput } from '@/shared/ui/search-input'
import { searchSpells } from '@/shared/api'
import type { SpellRow } from '@/entities/spell'
import { rankLabel, actionCostLabel } from '../lib/spellcasting-helpers'
import { parseJsonArray } from '@/shared/lib/json'

const DIALOG_TRADITIONS = ['arcane', 'divine', 'occult', 'primal'] as const
const DIALOG_TRADITION_COLORS: Record<string, string> = {
  arcane: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  divine: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  occult: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  primal: 'bg-green-500/20 text-green-300 border-green-500/40',
}

export function SpellSearchDialog({ open, onOpenChange, defaultRank, defaultTradition, focusOnly, onAdd }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  defaultRank: number
  defaultTradition?: string
  focusOnly?: boolean
  onAdd: (name: string, rank: number) => void
}) {
  const [query, setQuery] = useState('')
  const [tradition, setTradition] = useState<string | null>(defaultTradition ?? null)
  const [rank, setRank] = useState<number | null>(defaultRank)
  const [results, setResults] = useState<SpellRow[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset filters when dialog opens
  useEffect(() => {
    if (open) {
      setQuery('')
      setTradition(defaultTradition ?? null)
      setRank(defaultRank)
      setResults([])
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open, defaultRank, defaultTradition])

  // Debounced search
  useEffect(() => {
    if (!open) return
    setLoading(true)
    const t = setTimeout(async () => {
      const r = await searchSpells(
        query,
        rank ?? undefined,
        focusOnly ? undefined : (tradition ?? undefined),
        focusOnly ? 'focus' : undefined
      )
      setResults(r)
      setLoading(false)
    }, 200)
    return () => clearTimeout(t)
  }, [query, rank, tradition, open, focusOnly])

  return (
    <Dialog modal={false} open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-sm">{focusOnly ? 'Add Focus Spell' : 'Add Spell'}</DialogTitle>
        </DialogHeader>

        {/* Search + filters */}
        <div className="px-4 pt-3 pb-2 space-y-2 border-b border-border/30">
          <SearchInput
            ref={inputRef}
            loading={loading}
            placeholder={focusOnly ? "Search focus spells…" : "Search spells…"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 text-sm bg-secondary/30"
          />
          {/* Tradition filter (hidden for focus spells) */}
          {!focusOnly && (
            <div className="flex flex-wrap gap-1.5">
              {DIALOG_TRADITIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTradition((p) => (p === t ? null : t))}
                  className={cn(
                    "px-2 py-0.5 text-[11px] rounded border uppercase tracking-wider font-semibold transition-opacity",
                    DIALOG_TRADITION_COLORS[t],
                    tradition && tradition !== t && "opacity-30"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          {/* Rank filter */}
          <div className="flex flex-wrap gap-1">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => (
              <button
                key={r}
                onClick={() => setRank((p) => (p === r ? null : r))}
                className={cn(
                  "w-7 h-6 text-xs rounded border transition-colors font-mono",
                  rank === r
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/50 text-muted-foreground border-border/40 hover:border-border"
                )}
              >
                {r === 0 ? 'C' : r}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {loading ? 'Searching…' : `${results.length} spell${results.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 min-h-0">
          {results.map((s) => {
            const traditions = parseJsonArray(s.traditions)
            return (
              <div
                key={s.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{s.name}</span>
                    {s.action_cost && (
                      <span className="font-mono text-primary text-xs shrink-0">
                        {actionCostLabel(s.action_cost)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{rankLabel(s.rank)}</span>
                    {traditions.map((t) => (
                      <span key={t} className={cn("px-1 py-0 text-[9px] rounded border uppercase font-semibold", DIALOG_TRADITION_COLORS[t] ?? '')}>
                        {t.slice(0, 3)}
                      </span>
                    ))}
                    {s.save_stat && <span className="text-[10px] text-muted-foreground capitalize">{s.save_stat}</span>}
                  </div>
                </div>
                <button
                  onClick={() => onAdd(s.name, rank ?? s.rank)}
                  className="shrink-0 px-2 py-1 text-xs rounded border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
                >
                  Add
                </button>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
