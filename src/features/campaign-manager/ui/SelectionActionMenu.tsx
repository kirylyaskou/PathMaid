import { Link, MapPin, NotebookPen, Package, UserRound } from 'lucide-react'
import { Button } from '@/shared/ui/button'

interface SelectionActionMenuProps {
  selectedText: string
  onLink: () => void
  onCreateNote: () => void
  onCreateNpc: () => void
  onCreateItem: () => void
  onCreateLocation: () => void
}

export function SelectionActionMenu({
  selectedText,
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
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onLink}>
        <Link className="h-4 w-4" />
        Add link
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onCreateNote}>
        <NotebookPen className="h-4 w-4" />
        Create note
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onCreateNpc}>
        <UserRound className="h-4 w-4" />
        Create NPC
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onCreateItem}>
        <Package className="h-4 w-4" />
        Create item
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onCreateLocation}>
        <MapPin className="h-4 w-4" />
        Create location
      </Button>
    </div>
  )
}
