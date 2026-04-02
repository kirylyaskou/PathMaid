import { useState, useEffect, useMemo } from 'react'
import { Search, Zap } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import { getAllActions } from '@/shared/api'
import type { ActionRow } from '@/shared/api'
import { cn } from '@/shared/lib/utils'

type CategoryFilter = 'all' | 'basic' | 'skill' | 'exploration' | 'downtime'

const CATEGORY_TABS: { value: CategoryFilter; label: string; color: string; badge: string }[] = [
  { value: 'all',         label: 'All',         color: 'text-foreground',  badge: '' },
  { value: 'basic',       label: 'Basic',       color: 'text-blue-400',    badge: 'bg-blue-900/40 text-blue-300 border-blue-700/40' },
  { value: 'skill',       label: 'Skill',       color: 'text-green-400',   badge: 'bg-green-900/40 text-green-300 border-green-700/40' },
  { value: 'exploration', label: 'Exploration', color: 'text-purple-400',  badge: 'bg-purple-900/40 text-purple-300 border-purple-700/40' },
  { value: 'downtime',    label: 'Downtime',    color: 'text-zinc-400',    badge: 'bg-zinc-800/50 text-zinc-400 border-zinc-700/40' },
]

const CATEGORY_BADGE: Record<string, string> = {
  basic:       'bg-blue-900/40 text-blue-300 border-blue-700/40',
  skill:       'bg-green-900/40 text-green-300 border-green-700/40',
  exploration: 'bg-purple-900/40 text-purple-300 border-purple-700/40',
  downtime:    'bg-zinc-800/50 text-zinc-400 border-zinc-700/40',
}

function actionCostDisplay(row: ActionRow): string {
  if (row.action_type === 'reaction') return '↩'
  if (row.action_type === 'free') return '◇'
  if (row.action_cost === 1) return '◆'
  if (row.action_cost === 2) return '◆◆'
  if (row.action_cost === 3) return '◆◆◆'
  return '●'
}

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
  text = text.replace(/\[\[\/act ([^\]]+)\]\]\{([^}]+)\}/g, '$2')
  text = text.replace(/\[\[\/act ([^\]]+)\]\]/g, (_, slug: string) => slug.replace(/-/g, ' '))
  text = text.replace(/\[\[\/br [^\]]*\]\]\{([^}]+)\}/g, '$1')
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

function ActionCard({ action, expanded, onToggle }: {
  action: ActionRow
  expanded: boolean
  onToggle: () => void
}) {
  const traits: string[] = action.traits ? JSON.parse(action.traits) : []
  const costDisplay = actionCostDisplay(action)
  const badgeClass = CATEGORY_BADGE[action.action_category] ?? CATEGORY_BADGE.basic

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
        {/* Action cost */}
        <span className="font-mono text-xs text-amber-400 w-8 shrink-0 text-center">
          {costDisplay}
        </span>

        <span className="font-semibold text-sm flex-1">{action.name}</span>

        {/* Category badge */}
        <span className={cn(
          'px-1.5 py-0.5 text-[10px] rounded border uppercase tracking-wider font-semibold shrink-0',
          badgeClass
        )}>
          {action.action_category}
        </span>
      </div>

      {/* Traits — always visible if present */}
      {traits.length > 0 && (
        <div className="px-3 pb-1.5 flex flex-wrap gap-1">
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

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-border/30 pt-2 space-y-2">
          {action.description && (
            <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">
              {sanitize(action.description)}
            </p>
          )}
          {action.source_book && (
            <p className="text-[10px] text-muted-foreground/60 italic">{action.source_book}</p>
          )}
        </div>
      )}
    </div>
  )
}

export function ActionsPage() {
  const [allActions, setAllActions] = useState<ActionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    getAllActions()
      .then(setAllActions)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let list = allActions
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter((a) => a.name.toLowerCase().includes(q))
    }
    if (activeCategory !== 'all') {
      list = list.filter((a) => a.action_category === activeCategory)
    }
    return list
  }, [allActions, query, activeCategory])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="p-3 border-b border-border/50 space-y-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search actions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-1">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveCategory(tab.value)}
              className={cn(
                'px-2 py-0.5 text-[11px] rounded border font-semibold transition-colors',
                activeCategory === tab.value
                  ? cn(tab.color, 'bg-secondary border-current')
                  : 'text-muted-foreground border-border/40 hover:border-border'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <div className="px-3 py-1.5 shrink-0 border-b border-border/30">
        <p className="text-xs text-muted-foreground">
          {loading
            ? 'Loading…'
            : `${filtered.length} action${filtered.length !== 1 ? 's' : ''}`}
          {(query || activeCategory !== 'all') && !loading && (
            <button
              onClick={() => { setQuery(''); setActiveCategory('all') }}
              className="ml-2 text-primary hover:underline"
            >
              clear
            </button>
          )}
        </p>
      </div>

      {/* Action list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Zap className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">
              {allActions.length === 0
                ? 'Run sync to import actions'
                : 'No actions match the filters'}
            </p>
          </div>
        )}
        {filtered.map((action) => (
          <ActionCard
            key={action.id}
            action={action}
            expanded={expandedId === action.id}
            onToggle={() => setExpandedId((prev) => (prev === action.id ? null : action.id))}
          />
        ))}
      </div>
    </div>
  )
}
