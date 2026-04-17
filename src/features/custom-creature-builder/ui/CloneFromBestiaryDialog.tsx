import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { SearchInput } from '@/shared/ui/search-input'
import { Button } from '@/shared/ui/button'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { LevelBadge } from '@/shared/ui/level-badge'
import { searchCreatures, fetchCreatureById } from '@/shared/api/creatures'
import type { CreatureRow } from '@/shared/api/creatures'
import { toCreatureStatBlockData } from '@/entities/creature/model/mappers'
import type { CreatureStatBlockData } from '@/entities/creature/model/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Emits the mapped, source-normalized stat block. Caller decides whether to
  // persist via createCustomCreature or REPLACE_ALL in an existing form.
  onClone: (data: CreatureStatBlockData) => void | Promise<void>
}

// D-21: Clone from bestiary = modal picker analogous to SpellSearchDialog.
// Pitfall 8: reset `source` to 'custom' on the mapped stat block so a later
// export does not carry the Foundry pack name (e.g. "Monster Core").
export function CloneFromBestiaryDialog({ open, onOpenChange, onClone }: Props) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [results, setResults] = useState<CreatureRow[]>([])
  const [loading, setLoading] = useState(false)
  const [cloning, setCloning] = useState<string | null>(null)

  // 200ms debounce — matches SpellSearchDialog / UI-SPEC Micro-interactions.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 200)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (!open) return
    if (!debounced.trim()) {
      setResults([])
      return
    }
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const rows = await searchCreatures(debounced.trim())
        if (!cancelled) setResults(rows)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [debounced, open])

  // Reset on close.
  useEffect(() => {
    if (!open) {
      setQuery('')
      setDebounced('')
      setResults([])
      setCloning(null)
    }
  }, [open])

  async function handlePick(row: CreatureRow) {
    setCloning(row.id)
    try {
      // Re-fetch the full row to ensure raw_json is present and mapper has everything it needs.
      const full = await fetchCreatureById(row.id)
      if (!full) return
      const mapped = toCreatureStatBlockData(full)
      // Pitfall 8: reset source to 'custom' so exported JSON doesn't carry foreign pack name.
      const normalized: CreatureStatBlockData = {
        ...mapped,
        source: 'custom',
      }
      await onClone(normalized)
      onOpenChange(false)
    } finally {
      setCloning(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-base">Clone from Bestiary</DialogTitle>
          <DialogDescription className="text-xs">
            Pick a bestiary creature to copy into your custom library. You can edit it afterwards.
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 pb-2 border-b border-border/30">
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search creatures by name…"
            className="h-8 text-sm bg-secondary/30"
            loading={loading}
            autoFocus
          />
        </div>

        <ScrollArea className="flex-1 p-2 min-h-0">
          {loading && (
            <p className="text-sm text-muted-foreground text-center py-8">Searching…</p>
          )}
          {!loading && debounced.trim() && results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No creatures found</p>
          )}
          {!loading && !debounced.trim() && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Start typing a name.
            </p>
          )}
          <div className="space-y-1">
            {results.map((row) => (
              <div
                key={row.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-secondary/30 hover:bg-secondary/50"
              >
                <LevelBadge level={row.level ?? 0} size="sm" />
                <span className="flex-1 text-sm font-medium truncate">{row.name}</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={cloning === row.id}
                  onClick={() => void handlePick(row)}
                >
                  {cloning === row.id ? 'Cloning…' : 'Clone'}
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
