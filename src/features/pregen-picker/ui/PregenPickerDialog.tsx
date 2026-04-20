import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { SearchInput } from '@/shared/ui/search-input'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { LevelBadge } from '@/shared/ui/level-badge'
import { Badge } from '@/shared/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { getPregenCharacters, type CharacterRecord } from '@/shared/api'
import { filterPregens, derivePregenSources, sourceLabel } from '../model/filter'

// Phase 71 — shared picker consumed by:
//   - Characters page (mode='pc') → instantiates a user-owned PC.
//   - Custom Creature Builder (mode='npc') → clones into custom_creatures.
// Mode is informational only (affects copy + icon language). The row shape
// returned via `onPick` is identical; callers decide how to persist it.

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (pregen: CharacterRecord) => void | Promise<void>
  mode: 'pc' | 'npc'
}

const ALL_SOURCES = '__all__'

export function PregenPickerDialog({ open, onOpenChange, onPick, mode }: Props) {
  const [rows, setRows] = useState<CharacterRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [source, setSource] = useState<string>(ALL_SOURCES)
  const [picking, setPicking] = useState<string | null>(null)

  // Debounce search 200ms (parity with CloneFromBestiaryDialog).
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 200)
    return () => clearTimeout(t)
  }, [query])

  // Load catalogue once per open.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const data = await getPregenCharacters()
        if (!cancelled) setRows(data)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  // Reset state on close so reopening is clean.
  useEffect(() => {
    if (!open) {
      setQuery('')
      setDebounced('')
      setSource(ALL_SOURCES)
      setPicking(null)
    }
  }, [open])

  const sources = useMemo(() => derivePregenSources(rows), [rows])
  const filtered = useMemo(
    () => filterPregens(rows, debounced, source === ALL_SOURCES ? null : source),
    [rows, debounced, source],
  )

  async function handlePick(row: CharacterRecord) {
    setPicking(row.id)
    try {
      await onPick(row)
      onOpenChange(false)
    } finally {
      setPicking(null)
    }
  }

  const title = mode === 'pc' ? 'Use Pregen as Character' : 'Use Pregen as Enemy'
  const description =
    mode === 'pc'
      ? 'Pick a Paizo iconic or pregen to copy into your characters.'
      : 'Pick a Paizo iconic or pregen to clone into your custom creatures.'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-base">{title}</DialogTitle>
          <DialogDescription className="text-xs">{description}</DialogDescription>
        </DialogHeader>

        <div className="px-4 pb-2 space-y-2 border-b border-border/30">
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pregens by name…"
            className="h-8 text-sm bg-secondary/30"
            autoFocus
          />
          {sources.length > 1 && (
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="h-8 text-xs" aria-label="Pregen source filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SOURCES}>All sources</SelectItem>
                {sources.map((token) => (
                  <SelectItem key={token} value={token}>
                    {sourceLabel(token)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <ScrollArea className="flex-1 p-2 min-h-0">
          {loading && (
            <p className="text-sm text-muted-foreground text-center py-8">Loading pregens…</p>
          )}
          {!loading && rows.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No pregens synced yet. Run sync to import Paizo iconics.
            </p>
          )}
          {!loading && rows.length > 0 && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No pregens match the current filter.
            </p>
          )}
          <div className="space-y-1">
            {filtered.map((row) => (
              <button
                key={row.id}
                type="button"
                disabled={picking === row.id}
                onClick={() => void handlePick(row)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors text-left disabled:opacity-60"
              >
                <LevelBadge level={row.level ?? 0} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{row.name}</div>
                  {row.class && (
                    <div className="text-xs text-muted-foreground truncate">
                      {row.class}
                      {row.ancestry ? ` · ${row.ancestry}` : ''}
                    </div>
                  )}
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {sourceLabel(row.sourceAdventure ?? '__iconics__')}
                </Badge>
              </button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
