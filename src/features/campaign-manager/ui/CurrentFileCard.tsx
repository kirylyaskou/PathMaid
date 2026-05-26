import { Pin, PinOff } from 'lucide-react'
import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { findNodeById, type CampaignNode } from '@/entities/campaign'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { useCampaignManagerStore } from '../model/store'
import { MarkdownFileEditor } from './MarkdownFileEditor'
import { TableFileEditor } from './TableFileEditor'
import { TypedProfilePanel } from './TypedProfilePanel'

interface CurrentFileCardProps {
  nodes: CampaignNode[]
  activeNodeId: string | null
  pins: string[]
  onTogglePin: (nodeId: string) => void
}

export function CurrentFileCard({
  nodes,
  activeNodeId,
  pins,
  onTogglePin,
}: CurrentFileCardProps) {
  const activeNode = useMemo(() => findNodeById(nodes, activeNodeId), [activeNodeId, nodes])
  const isPinned = activeNode ? pins.includes(activeNode.id) : false
  const { documents, tables } = useCampaignManagerStore(
    useShallow((state) => ({
      documents: state.documents,
      tables: state.tables,
    })),
  )
  const activeDocument = activeNode && activeNode.kind !== 'table' ? documents[activeNode.id] : null
  const activeTable = activeNode?.kind === 'table' ? tables[activeNode.id] : null

  if (!activeNode) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select or create a file.
      </div>
    )
  }

  const PinIcon = isPinned ? PinOff : Pin

  return (
    <div className="flex h-full min-w-0 items-center justify-center p-4">
      <Card className="h-full w-full max-w-5xl rounded-md py-0">
        <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border/50 p-4">
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{activeNode.title}</CardTitle>
            <div className="mt-1 text-xs capitalize text-muted-foreground">{activeNode.kind}</div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onTogglePin(activeNode.id)}
            aria-label={isPinned ? `Unpin ${activeNode.title}` : `Pin ${activeNode.title}`}
          >
            <PinIcon className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 p-0">
          {activeNode.kind === 'table' ? (
            activeTable ? (
              <div className="flex h-full min-h-0 p-4">
                <TableFileEditor node={activeNode} table={activeTable} />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                Loading file...
              </div>
            )
          ) : activeDocument ? (
            <div className="flex h-full min-h-0">
              <div className="min-w-0 flex-1 p-4">
                <MarkdownFileEditor node={activeNode} document={activeDocument} />
              </div>
              <TypedProfilePanel node={activeNode} document={activeDocument} />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
              Loading file...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
