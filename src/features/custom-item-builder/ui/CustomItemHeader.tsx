import { Clipboard, Copy, Save } from 'lucide-react'
import { Button } from '@/shared/ui/button'

interface CustomItemHeaderProps {
  name: string
  dirty: boolean
  saving: boolean
  onSave: () => void
  onClone: () => void
  onCopyCard: () => void
}

export function CustomItemHeader({
  name,
  dirty,
  saving,
  onSave,
  onClone,
  onCopyCard,
}: CustomItemHeaderProps) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/50 bg-card/80 px-4 py-3">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold">{name || 'Custom Item'}</h1>
        <p className="text-xs text-muted-foreground">{dirty ? 'Unsaved changes' : 'Saved'}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onClone}>
          <Copy className="h-4 w-4" /> Clone
        </Button>
        <Button variant="outline" size="sm" onClick={onCopyCard}>
          <Clipboard className="h-4 w-4" /> Copy Card
        </Button>
        <Button size="sm" onClick={onSave} disabled={!dirty || saving}>
          <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
