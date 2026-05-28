import { ArrowLeft, Download, GitGraph, PencilLine } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useShallow } from 'zustand/react/shallow'
import {
  findNodeById,
  type CampaignBucket,
  type CampaignNode,
  type CampaignNodeKind,
} from '@/entities/campaign'
import { Button } from '@/shared/ui/button'
import { exportCampaignToPathmaidFile } from '../model/export-campaign'
import { useCampaignManagerStore } from '../model/store'
import { CampaignTree } from './CampaignTree'
import { CurrentFileCard } from './CurrentFileCard'
import { GraphMode } from './GraphMode'
import { PinnedFileRail } from './PinnedFileRail'
import { RefsRail } from './RefsRail'

type CreateCampaignNodeKind = Exclude<CampaignNodeKind, 'bucket'>

interface CampaignWorkspaceProps {
  onBack: () => void
}

const DEFAULT_TITLES: Record<CreateCampaignNodeKind, string> = {
  folder: 'New Folder',
  note: 'New Note',
  table: 'New Table',
  npc: 'New NPC',
  item: 'New Item',
  location: 'New Location',
}

function bucketForKind(kind: CreateCampaignNodeKind, parent: CampaignNode): CampaignBucket {
  if (kind === 'table') {
    return 'tables'
  }

  if (kind === 'npc') {
    return 'npcs'
  }

  if (kind === 'item') {
    return 'items'
  }

  if (kind === 'location') {
    return 'locations'
  }

  return parent.bucket
}

function rootBucketForKind(kind: CreateCampaignNodeKind): CampaignBucket {
  if (kind === 'table') {
    return 'tables'
  }

  if (kind === 'npc') {
    return 'npcs'
  }

  if (kind === 'item') {
    return 'items'
  }

  if (kind === 'location') {
    return 'locations'
  }

  return 'notes'
}

function defaultChildKind(parent: CampaignNode): CreateCampaignNodeKind {
  if (parent.bucket === 'tables') {
    return 'table'
  }

  if (parent.bucket === 'npcs') {
    return 'npc'
  }

  if (parent.bucket === 'items') {
    return 'item'
  }

  if (parent.bucket === 'locations') {
    return 'location'
  }

  return 'note'
}

export function CampaignWorkspace({ onBack }: CampaignWorkspaceProps) {
  const {
    campaigns,
    activeCampaignId,
    nodes,
    links,
    pins,
    graphPositions,
    activeNodeId,
    mode,
    openNode,
    createNode,
    deleteNode,
    renameNode,
    moveNode,
    saveGraphNodePosition,
    togglePin,
    setMode,
  } = useCampaignManagerStore(
    useShallow((state) => ({
      campaigns: state.campaigns,
      activeCampaignId: state.activeCampaignId,
      nodes: state.nodes,
      links: state.links,
      pins: state.pins,
      graphPositions: state.graphPositions,
      activeNodeId: state.activeNodeId,
      mode: state.mode,
      openNode: state.openNode,
      createNode: state.createNode,
      deleteNode: state.deleteNode,
      renameNode: state.renameNode,
      moveNode: state.moveNode,
      saveGraphNodePosition: state.saveGraphNodePosition,
      togglePin: state.togglePin,
      setMode: state.setMode,
    })),
  )

  const activeCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === activeCampaignId) ?? null,
    [activeCampaignId, campaigns],
  )
  const activeNode = useMemo(() => findNodeById(nodes, activeNodeId), [activeNodeId, nodes])
  const [isExporting, setIsExporting] = useState(false)

  const handleOpen = useCallback(
    (nodeId: string) => {
      void openNode(nodeId)
    },
    [openNode],
  )

  const handleTogglePin = useCallback(
    (nodeId: string) => {
      void togglePin(nodeId)
    },
    [togglePin],
  )

  const handleSetEditorMode = useCallback(() => {
    setMode('editor')
  }, [setMode])

  const handleSetGraphMode = useCallback(() => {
    setMode('graph')
  }, [setMode])

  const handleExportCampaign = useCallback(() => {
    if (!activeCampaign || isExporting) {
      return
    }

    setIsExporting(true)
    void exportCampaignToPathmaidFile(activeCampaign)
      .then(() => {
        toast('Campaign exported')
      })
      .catch((error) => {
        console.error('Campaign export failed', error)
        toast.error('Failed to export campaign')
      })
      .finally(() => {
        setIsExporting(false)
      })
  }, [activeCampaign, isExporting])

  const createInParent = useCallback(
    (parentId: string | null, requestedKind?: CreateCampaignNodeKind) => {
      const parent = findNodeById(nodes, parentId)

      if (!activeCampaignId || (parentId && !parent)) {
        return
      }

      const kind = requestedKind ?? (parent ? defaultChildKind(parent) : 'note')
      void createNode({
        campaignId: activeCampaignId,
        parentId,
        kind,
        bucket: parent ? bucketForKind(kind, parent) : rootBucketForKind(kind),
        title: DEFAULT_TITLES[kind],
      }).catch(() => {
        toast.error('Failed to create campaign file')
      })
    },
    [activeCampaignId, createNode, nodes],
  )

  const handleRenameNode = useCallback(
    (nodeId: string, title: string) => {
      void renameNode(nodeId, title).catch(() => {
        toast.error('Failed to rename campaign file')
      })
    },
    [renameNode],
  )

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      void deleteNode(nodeId).catch(() => {
        toast.error('Failed to delete campaign file')
      })
    },
    [deleteNode],
  )

  const handleMoveNode = useCallback(
    (nodeId: string, parentId: string | null) => {
      void moveNode(nodeId, parentId).catch(() => {
        toast.error('Failed to move campaign file')
      })
    },
    [moveNode],
  )

  const handleSaveGraphNodePosition = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      void saveGraphNodePosition(nodeId, position).catch(() => {
        toast.error('Failed to save graph position')
      })
    },
    [saveGraphNodePosition],
  )

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/50 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">
              {activeCampaign?.name ?? 'Campaign workspace'}
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              {activeNode?.title ?? 'No file selected'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!activeCampaign || isExporting}
            onClick={handleExportCampaign}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            type="button"
            variant={mode === 'editor' ? 'secondary' : 'outline'}
            size="sm"
            onClick={handleSetEditorMode}
          >
            <PencilLine className="h-4 w-4" />
            Editor
          </Button>
          <Button
            type="button"
            variant={mode === 'graph' ? 'secondary' : 'outline'}
            size="sm"
            onClick={handleSetGraphMode}
          >
            <GitGraph className="h-4 w-4" />
            Graph
          </Button>
        </div>
      </header>

      <PinnedFileRail nodes={nodes} pins={pins} activeNodeId={activeNodeId} onOpen={handleOpen} />

      {mode === 'graph' ? (
        <GraphMode
          nodes={nodes}
          links={links}
          graphPositions={graphPositions}
          onOpen={handleOpen}
          onNodePositionChange={handleSaveGraphNodePosition}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="grid h-full min-h-0 min-w-[56rem] grid-cols-[18rem_minmax(21rem,1fr)_17rem]">
            <CampaignTree
              nodes={nodes}
              activeNodeId={activeNodeId}
              onOpen={handleOpen}
              onCreate={createInParent}
              onRename={handleRenameNode}
              onDelete={handleDeleteNode}
              onMove={handleMoveNode}
            />
            <CurrentFileCard
              nodes={nodes}
              activeNodeId={activeNodeId}
              pins={pins}
              onTogglePin={handleTogglePin}
            />
            <RefsRail nodes={nodes} links={links} activeNodeId={activeNodeId} onOpen={handleOpen} />
          </div>
        </div>
      )}
    </div>
  )
}
