import {
  Bold,
  Highlighter,
  Italic,
  Link,
  MapPin,
  NotebookPen,
  Package,
  Strikethrough,
  UserRound,
} from 'lucide-react'
import type { MouseEvent } from 'react'
import { Button } from '@/shared/ui/button'

export type SelectionHighlightColor = 'red' | 'green' | 'yellow' | 'blue'

interface SelectionActionMenuProps {
  selectedText: string
  isPending: boolean
  onLink: () => void
  onHighlight?: (color: SelectionHighlightColor) => void
  onBold?: () => void
  onItalic?: () => void
  onStrike?: () => void
  onCreateNote: () => void
  onCreateNpc: () => void
  onCreateItem: () => void
  onCreateLocation: () => void
}

const HIGHLIGHT_COLORS: Array<{
  color: SelectionHighlightColor
  label: string
  className: string
}> = [
  { color: 'red', label: 'Red highlight', className: 'bg-red-400' },
  { color: 'green', label: 'Green highlight', className: 'bg-emerald-400' },
  { color: 'yellow', label: 'Yellow highlight', className: 'bg-amber-300' },
  { color: 'blue', label: 'Blue highlight', className: 'bg-sky-400' },
]

export function SelectionActionMenu({
  selectedText,
  isPending,
  onLink,
  onHighlight,
  onBold,
  onItalic,
  onStrike,
  onCreateNote,
  onCreateNpc,
  onCreateItem,
  onCreateLocation,
}: SelectionActionMenuProps) {
  if (selectedText.trim().length === 0) {
    return null
  }

  const handleActionMouseDown =
    (action: () => void) => (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      action()
    }

  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-2"
      onMouseDown={(event) => event.preventDefault()}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onMouseDown={handleActionMouseDown(onLink)}
      >
        <Link className="h-4 w-4" />
        Add link
      </Button>
      {onBold ? (
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={isPending}
          aria-label="Bold"
          title="Bold"
          onMouseDown={handleActionMouseDown(onBold)}
        >
          <Bold className="h-4 w-4" />
        </Button>
      ) : null}
      {onItalic ? (
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={isPending}
          aria-label="Italic"
          title="Italic"
          onMouseDown={handleActionMouseDown(onItalic)}
        >
          <Italic className="h-4 w-4" />
        </Button>
      ) : null}
      {onStrike ? (
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={isPending}
          aria-label="Strikethrough"
          title="Strikethrough"
          onMouseDown={handleActionMouseDown(onStrike)}
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
      ) : null}
      {onHighlight ? (
        <div className="flex items-center gap-1 rounded-md border border-border px-1 py-0.5">
          <Highlighter className="mx-1 h-4 w-4 text-muted-foreground" />
          {HIGHLIGHT_COLORS.map((highlight) => (
            <Button
              key={highlight.color}
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={isPending}
              aria-label={highlight.label}
              title={highlight.label}
              onMouseDown={handleActionMouseDown(() => onHighlight(highlight.color))}
            >
              <span className={`h-4 w-4 rounded-full ${highlight.className}`} />
            </Button>
          ))}
        </div>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onMouseDown={handleActionMouseDown(onCreateNote)}
      >
        <NotebookPen className="h-4 w-4" />
        Create note
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onMouseDown={handleActionMouseDown(onCreateNpc)}
      >
        <UserRound className="h-4 w-4" />
        Create NPC
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onMouseDown={handleActionMouseDown(onCreateItem)}
      >
        <Package className="h-4 w-4" />
        Create item
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onMouseDown={handleActionMouseDown(onCreateLocation)}
      >
        <MapPin className="h-4 w-4" />
        Create location
      </Button>
    </div>
  )
}
