import { Pin } from 'lucide-react'
import { useMemo } from 'react'
import { findNodeById, type CampaignNode } from '@/entities/campaign'
import { Button } from '@/shared/ui/button'

interface PinnedFileRailProps {
  nodes: CampaignNode[]
  pins: string[]
  activeNodeId: string | null
  onOpen: (nodeId: string) => void
}

export function PinnedFileRail({ nodes, pins, activeNodeId, onOpen }: PinnedFileRailProps) {
  const pinnedNodes = useMemo(
    () => pins.map((pinId) => findNodeById(nodes, pinId)).filter((node): node is CampaignNode => node !== null),
    [nodes, pins],
  )

  return (
    <div className="flex min-h-12 shrink-0 items-center gap-2 border-b border-border/50 px-4 py-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
        <Pin className="h-3.5 w-3.5" />
        Pinned
      </div>
      {pinnedNodes.length === 0 ? (
        <div className="text-xs text-muted-foreground">No pinned files yet.</div>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          {pinnedNodes.map((node) => (
            <Button
              key={node.id}
              type="button"
              variant={node.id === activeNodeId ? 'secondary' : 'outline'}
              size="sm"
              className="max-w-48 shrink-0"
              onClick={() => onOpen(node.id)}
            >
              <span className="truncate">{node.title}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
