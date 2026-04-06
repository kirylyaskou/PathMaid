import { Swords, X, Eye } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { CharacterRecord } from '@/shared/api/characters'

interface CharacterCardProps {
  character: CharacterRecord
  onAddToCombat: (character: CharacterRecord) => void
  onDelete: (character: CharacterRecord) => void
  onView?: (character: CharacterRecord) => void
}

export function CharacterCard({ character, onAddToCombat, onDelete, onView }: CharacterCardProps) {
  return (
    <div
      className="relative group rounded-md border border-border/40 bg-secondary/30 hover:border-border/70 hover:bg-secondary/50 transition-colors p-3 cursor-pointer"
      onClick={() => onView?.(character)}
    >
      <p className="font-semibold text-sm truncate">{character.name}</p>
      <p className="text-xs text-muted-foreground mt-0.5">
        {character.class ?? '—'} • Level {character.level ?? '?'}
      </p>
      <p className="text-xs text-muted-foreground">{character.ancestry ?? '—'}</p>
      <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onView && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            title="View sheet"
            onClick={(e) => { e.stopPropagation(); onView(character) }}
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          title="Add to combat"
          onClick={(e) => { e.stopPropagation(); onAddToCombat(character) }}
        >
          <Swords className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-destructive hover:text-destructive"
          title="Delete"
          onClick={(e) => { e.stopPropagation(); onDelete(character) }}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}
