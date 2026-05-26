import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { searchItems, searchCustomItems, cloneCatalogItemToCustomItem, cloneCustomItem } from '@/shared/api'
import type { CustomItemRow, ItemRow } from '@/shared/api'
import { formatCustomItemSubtitle } from '@/entities/item'

interface CloneFromItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCloned: (id: string) => void
}

type CloneCandidate =
  | { kind: 'catalog'; item: ItemRow }
  | { kind: 'custom'; item: CustomItemRow }

function candidateKey(candidate: CloneCandidate): string {
  return `${candidate.kind}:${candidate.item.id}`
}

function candidateTitle(candidate: CloneCandidate): string {
  return candidate.item.name
}

function candidateSubtitle(candidate: CloneCandidate): string {
  if (candidate.kind === 'custom') return `Custom · ${formatCustomItemSubtitle(candidate.item)}`
  return `Catalog · Item ${candidate.item.level} · ${candidate.item.item_type}`
}

export function CloneFromItemDialog({ open, onOpenChange, onCloned }: CloneFromItemDialogProps) {
  const [query, setQuery] = useState('')
  const [catalogItems, setCatalogItems] = useState<ItemRow[]>([])
  const [customItems, setCustomItems] = useState<CustomItemRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (q.length < 2) {
      setCatalogItems([])
      setCustomItems([])
      return
    }
    let cancelled = false
    setLoading(true)
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const [catalog, custom] = await Promise.all([
            searchItems(q),
            searchCustomItems(q),
          ])
          if (!cancelled) {
            setCatalogItems(catalog.slice(0, 8))
            setCustomItems(custom.slice(0, 8))
          }
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open, query])

  const candidates = useMemo<CloneCandidate[]>(
    () => [
      ...customItems.map((item): CloneCandidate => ({ kind: 'custom', item })),
      ...catalogItems.map((item): CloneCandidate => ({ kind: 'catalog', item })),
    ],
    [catalogItems, customItems],
  )

  async function handleClone(candidate: CloneCandidate) {
    const id = candidate.kind === 'custom'
      ? await cloneCustomItem(candidate.item.id)
      : await cloneCatalogItemToCustomItem(candidate.item.id)
    onCloned(id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Clone Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              placeholder="Search official and custom items..."
            />
          </div>
          {loading && <p className="text-sm text-muted-foreground">Searching...</p>}
          <div className="max-h-80 overflow-y-auto space-y-1">
            {candidates.map((candidate) => (
              <button
                key={candidateKey(candidate)}
                type="button"
                onClick={() => void handleClone(candidate)}
                className="flex w-full items-center justify-between gap-3 rounded-md border border-border/50 bg-secondary/20 px-3 py-2 text-left hover:bg-secondary/45"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{candidateTitle(candidate)}</span>
                  <span className="block truncate text-xs text-muted-foreground">{candidateSubtitle(candidate)}</span>
                </span>
                <Button size="sm" variant="outline" tabIndex={-1}>Clone</Button>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
