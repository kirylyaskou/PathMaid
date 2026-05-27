import { Link, MapPin, NotebookPen, Package, UserRound } from 'lucide-react'
import { Button } from '@/shared/ui/button'

interface SelectionActionMenuProps {
  selectedText: string
  isPending: boolean
  onLink: () => void
  onCreateNote: () => void
  onCreateNpc: () => void
  onCreateItem: () => void
  onCreateLocation: () => void
}

export function SelectionActionMenu({
  selectedText,
  isPending,
  onLink,
  onCreateNote,
  onCreateNpc,
  onCreateItem,
  onCreateLocation,
}: SelectionActionMenuProps) {
  if (selectedText.trim().length === 0) {
    return null
  }

  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-2"
      onMouseDown={(event) => event.preventDefault()}
    >
      <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={onLink}>
        <Link className="h-4 w-4" />
        Add link
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={onCreateNote}>
        <NotebookPen className="h-4 w-4" />
        Create note
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={onCreateNpc}>
        <UserRound className="h-4 w-4" />
        Create NPC
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={onCreateItem}>
        <Package className="h-4 w-4" />
        Create item
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={onCreateLocation}
      >
        <MapPin className="h-4 w-4" />
        Create location
      </Button>
    </div>
  )
}
