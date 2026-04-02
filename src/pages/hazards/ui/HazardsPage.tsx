import { useState, useEffect, useMemo } from 'react'
import { Search, AlertTriangle } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import { LevelBadge } from '@/shared/ui/level-badge'
import { getAllHazards } from '@/shared/api'
import type { HazardRow } from '@/shared/api'
import { cn } from '@/shared/lib/utils'

type TypeFilter = 'all' | 'simple' | 'complex'

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ')
    .replace(/@\w+\[[^\]]*\](?:\{[^}]*\})?/g, '')
    .trim()
}

function resolveTokens(text: string): string {
  text = text.replace(/@UUID\[[^\]]*\]\{([^}]+)\}/g, '$1')
  text = text.replace(/@UUID\[([^\]]+)\]/g, (_, path: string) => {
    const seg = path.split('.').pop() ?? ''
    return /^[A-Za-z0-9]{16,}$/.test(seg) ? '' : seg.replace(/-/g, ' ')
  })
  text = text.replace(/@Condition\[[^\]]*\]\{([^}]+)\}/g, '$1')
  text = text.replace(/@Condition\[([^\]]+)\]/g, (_, s: string) => s)
  text = text.replace(/@Localize\[[^\]]+\]/g, '')
  text = text.replace(/@\w+\[[^\]]*\](?:\{[^}]*\})?/g, '')
  return text
}

function sanitize(html: string | null | undefined): string {
  if (!html) return ''
  return stripHtml(resolveTokens(html))
}

interface HazardAction {
  name: string
  actionType: string
  description: string | null
}

const ACTION_TYPE_LABEL: Record<string, string> = {
  action: '⚡',
  reaction: '↩',
  passive: '●',
  free: '◇',
}

function HazardCard({ hazard, expanded, onToggle }: {
  hazard: HazardRow
  expanded: boolean
  onToggle: () => void
}) {
  const traits: string[] = hazard.traits ? JSON.parse(hazard.traits) : []
  const actions: HazardAction[] = hazard.actions_json ? JSON.parse(hazard.actions_json) : []

  return (
    <div
      className={cn(
        'rounded-md border transition-colors cursor-pointer',
        expanded
          ? 'border-primary/40 bg-card'
          : 'border-border/40 bg-secondary/30 hover:border-border/70 hover:bg-secondary/50'
      )}
      onClick={onToggle}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <LevelBadge level={hazard.level} size="sm" />

        <span className="font-semibold text-sm flex-1">{hazard.name}</span>

        {hazard.is_complex ? (
          <span className="px-1.5 py-0.5 text-[10px] rounded border font-semibold bg-orange-900/40 text-orange-300 border-orange-700/40 shrink-0">
            complex
          </span>
        ) : (
          <span className="px-1.5 py-0.5 text-[10px] rounded border font-semibold bg-zinc-800/50 text-zinc-400 border-zinc-700/40 shrink-0">
            simple
          </span>
        )}

        {hazard.stealth_dc != null && (
          <span className="text-xs text-muted-foreground shrink-0">
            Stealth {hazard.stealth_dc}
          </span>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-border/30 pt-2 space-y-2">
          {/* Stat line: AC / Hardness / HP */}
          <div className="flex flex-wrap gap-3 text-xs">
            {hazard.ac != null && (
              <span>
                <span className="text-muted-foreground">AC </span>
                <span className="font-semibold">{hazard.ac}</span>
              </span>
            )}
            {hazard.hardness != null && hazard.hardness > 0 && (
              <span>
                <span className="text-muted-foreground">Hardness </span>
                <span className="font-semibold">{hazard.hardness}</span>
              </span>
            )}
            {hazard.has_health && hazard.hp != null && (
              <span>
                <span className="text-muted-foreground">HP </span>
                <span className="font-semibold text-green-400">{hazard.hp}</span>
              </span>
            )}
          </div>

          {/* Stealth details */}
          {hazard.stealth_details && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground/70">Stealth: </span>
              {sanitize(hazard.stealth_details)}
            </p>
          )}

          {/* Description */}
          {hazard.description && (
            <p className="text-xs text-foreground/80 leading-relaxed">
              {sanitize(hazard.description)}
            </p>
          )}

          {/* Disable */}
          {hazard.disable_details && (
            <div>
              <p className="text-xs font-semibold text-amber-300/80 mb-0.5">Disable</p>
              <p className="text-xs text-foreground/80 leading-relaxed">
                {sanitize(hazard.disable_details)}
              </p>
            </div>
          )}

          {/* Reset */}
          {hazard.reset_details && (
            <div>
              <p className="text-xs font-semibold text-blue-300/80 mb-0.5">Reset</p>
              <p className="text-xs text-foreground/80 leading-relaxed">
                {sanitize(hazard.reset_details)}
              </p>
            </div>
          )}

          {/* Actions */}
          {actions.length > 0 && (
            <div className="space-y-1.5">
              {actions.map((action, i) => (
                <div key={i} className="rounded bg-secondary/40 px-2 py-1.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[11px] text-muted-foreground">
                      {ACTION_TYPE_LABEL[action.actionType] ?? '●'}
                    </span>
                    <span className="text-xs font-semibold">{action.name}</span>
                  </div>
                  {action.description && (
                    <p className="text-xs text-foreground/70 leading-relaxed">
                      {sanitize(action.description)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Traits */}
          {traits.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {traits.map((trait) => (
                <span
                  key={trait}
                  className="px-1.5 py-0.5 text-[10px] rounded bg-secondary text-muted-foreground uppercase tracking-wide"
                >
                  {trait}
                </span>
              ))}
            </div>
          )}

          {/* Source */}
          {hazard.source_book && (
            <p className="text-[10px] text-muted-foreground/60 italic">{hazard.source_book}</p>
          )}
        </div>
      )}
    </div>
  )
}

export function HazardsPage() {
  const [allHazards, setAllHazards] = useState<HazardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    getAllHazards()
      .then(setAllHazards)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let list = allHazards
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter((h) => h.name.toLowerCase().includes(q))
    }
    if (typeFilter !== 'all') {
      list = list.filter((h) => h.hazard_type === typeFilter)
    }
    return list
  }, [allHazards, query, typeFilter])

  const TYPE_TABS: { value: TypeFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'simple', label: 'Simple' },
    { value: 'complex', label: 'Complex' },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="p-3 border-b border-border/50 space-y-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search hazards…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        <div className="flex gap-1">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setTypeFilter(tab.value)}
              className={cn(
                'px-2 py-0.5 text-[11px] rounded border font-semibold transition-colors',
                typeFilter === tab.value
                  ? 'text-foreground bg-secondary border-border'
                  : 'text-muted-foreground border-border/40 hover:border-border'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Count row */}
      <div className="px-3 py-1.5 shrink-0 border-b border-border/30">
        <p className="text-xs text-muted-foreground">
          {loading
            ? 'Loading…'
            : `${filtered.length} hazard${filtered.length !== 1 ? 's' : ''}`}
          {(query || typeFilter !== 'all') && !loading && (
            <button
              onClick={() => { setQuery(''); setTypeFilter('all') }}
              className="ml-2 text-primary hover:underline"
            >
              clear
            </button>
          )}
        </p>
      </div>

      {/* Hazard list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">
              {allHazards.length === 0
                ? 'Run sync to import hazards'
                : 'No hazards match the filters'}
            </p>
          </div>
        )}
        {filtered.map((hazard) => (
          <HazardCard
            key={hazard.id}
            hazard={hazard}
            expanded={expandedId === hazard.id}
            onToggle={() => setExpandedId((prev) => (prev === hazard.id ? null : hazard.id))}
          />
        ))}
      </div>
    </div>
  )
}
