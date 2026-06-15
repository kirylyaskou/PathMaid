import { Pin, PinOff, Trash2 } from 'lucide-react'
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { findNodeById, type CampaignNode } from '@/entities/campaign'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { useCampaignManagerStore } from '../model/store'

interface CurrentFileCardProps {
  nodes: CampaignNode[]
  activeNodeId: string | null
  pins: string[]
  onTogglePin: (nodeId: string) => void
}

const MarkdownFileEditor = lazy(() =>
  import('./MarkdownFileEditor').then((module) => ({ default: module.MarkdownFileEditor })),
)
const TableFileEditor = lazy(() =>
  import('./TableFileEditor').then((module) => ({ default: module.TableFileEditor })),
)
const TypedProfilePanel = lazy(() =>
  import('./TypedProfilePanel').then((module) => ({ default: module.TypedProfilePanel })),
)

function EditorLoadingState() {
  return (
    <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
      Loading file...
    </div>
  )
}

export function CurrentFileCard({
  nodes,
  activeNodeId,
  pins,
  onTogglePin,
}: CurrentFileCardProps) {
  const activeNode = useMemo(() => findNodeById(nodes, activeNodeId), [activeNodeId, nodes])
  const isPinned = activeNode ? pins.includes(activeNode.id) : false
  const { activeDocument, activeTable } = useCampaignManagerStore(
    useShallow((state) => ({
      activeDocument:
        activeNode && activeNode.kind !== 'table' ? (state.documents[activeNode.id] ?? null) : null,
      activeTable: activeNode?.kind === 'table' ? (state.tables[activeNode.id] ?? null) : null,
    })),
  )
  const renameNode = useCampaignManagerStore((state) => state.renameNode)
  const deleteNode = useCampaignManagerStore((state) => state.deleteNode)
  const [titleDraft, setTitleDraft] = useState(activeNode?.title ?? '')

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

  const handleDeleteNode = useCallback(() => {
    if (!activeNode || activeNode.isSystem) {
      return
    }

    void deleteNode(activeNode.id)
  }, [activeNode, deleteNode])

  if (!activeNode) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select or create a file.
      </div>
    )
  }

  const PinIcon = isPinned ? PinOff : Pin

  return (
    <div className="flex h-full min-h-0 min-w-0 overflow-hidden p-4">
      <Card className="h-full min-h-0 w-full min-w-0 gap-0 overflow-hidden rounded-md border-border/70 bg-card/95 py-0 shadow-sm">
        <CardHeader className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border/50 bg-muted/20 p-4">
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
            <div className="mt-1 text-xs font-medium tracking-wide text-pf-gold uppercase">
              {activeNode.kind}
            </div>
          </div>
          {!activeNode.isSystem ? (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => onTogglePin(activeNode.id)}
                aria-label={isPinned ? `Unpin ${activeNode.title}` : `Pin ${activeNode.title}`}
              >
                <PinIcon className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleDeleteNode}
                aria-label={`Delete ${activeNode.title}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 overflow-hidden p-0">
          {activeNode.kind === 'table' ? (
            activeTable ? (
              <Suspense fallback={<EditorLoadingState />}>
                <div className="flex h-full min-h-0 w-full min-w-0 overflow-hidden p-4">
                  <TableFileEditor node={activeNode} table={activeTable} />
                </div>
              </Suspense>
            ) : (
              <EditorLoadingState />
            )
          ) : activeDocument ? (
            <Suspense fallback={<EditorLoadingState />}>
              <div className="flex h-full min-h-0 w-full min-w-0 overflow-hidden">
                <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden p-4">
                  <MarkdownFileEditor node={activeNode} document={activeDocument} />
                </div>
                <TypedProfilePanel node={activeNode} document={activeDocument} />
              </div>
            </Suspense>
          ) : (
            <EditorLoadingState />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
