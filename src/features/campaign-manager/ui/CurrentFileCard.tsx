import { Pin, PinOff } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { findNodeById, type CampaignNode } from '@/entities/campaign'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
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
  const renameNode = useCampaignManagerStore((state) => state.renameNode)
  const [titleDraft, setTitleDraft] = useState(activeNode?.title ?? '')
  const activeDocument = activeNode && activeNode.kind !== 'table' ? documents[activeNode.id] : null
  const activeTable = activeNode?.kind === 'table' ? tables[activeNode.id] : null

  useEffect(() => {
    setTitleDraft(activeNode?.title ?? '')
  }, [activeNode?.id, activeNode?.title])

  const commitTitle = useCallback(() => {
    if (!activeNode || activeNode.isSystem) {
      return
    }

    void renameNode(activeNode.id, titleDraft)
  }, [activeNode, renameNode, titleDraft])

  const handleTitleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.currentTarget.blur()
      }
    },
    [],
  )

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
            <CardTitle>
              <Input
                value={titleDraft}
                disabled={activeNode.isSystem}
                onChange={(event) => setTitleDraft(event.target.value)}
                onBlur={commitTitle}
                onKeyDown={handleTitleKeyDown}
                aria-label="Rename file"
                className="h-8 border-transparent px-0 text-base font-semibold shadow-none focus-visible:px-2"
              />
            </CardTitle>
            <div className="mt-1 text-xs capitalize text-muted-foreground">{activeNode.kind}</div>
          </div>
          {!activeNode.isSystem ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onTogglePin(activeNode.id)}
              aria-label={isPinned ? `Unpin ${activeNode.title}` : `Pin ${activeNode.title}`}
            >
              <PinIcon className="h-4 w-4" />
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 p-0">
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
              <div className="flex min-w-0 flex-1 p-4">
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
