import { Link, useNavigate } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import { LevelBadge } from '@/shared/ui/level-badge'
import type { CustomCreatureRow } from '@/entities/creature/model/custom-creature-types'
import { PATHS } from '@/shared/routes'

interface Props {
  row: CustomCreatureRow
  onDelete: (id: string, name: string) => void
}

export function CustomCreatureListRow({ row, onDelete }: Props) {
  const navigate = useNavigate()
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-secondary/30 hover:bg-secondary/50 group">
      <Link
        to={PATHS.CUSTOM_CREATURE_EDIT(row.id)}
        className="flex items-center gap-2 flex-1 min-w-0"
      >
        <LevelBadge level={row.level} size="sm" />
        <span className="flex-1 text-sm font-medium truncate">{row.name}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
          {row.rarity}
        </span>
      </Link>
      <button
        type="button"
        aria-label="Edit"
        title="Edit"
        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground shrink-0"
        onClick={() => navigate(PATHS.CUSTOM_CREATURE_EDIT(row.id))}
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        aria-label="Delete"
        title="Delete"
        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive shrink-0"
        onClick={() => onDelete(row.id, row.name)}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
