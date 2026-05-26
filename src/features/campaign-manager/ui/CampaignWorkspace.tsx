import { ArrowLeft, GitGraph, PencilLine } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  findNodeById,
  type CampaignBucket,
  type CampaignNode,
  type CampaignNodeKind,
} from '@/entities/campaign'
import { Button } from '@/shared/ui/button'
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

export function CampaignWorkspace({ onBack }: CampaignWorkspaceProps) {
  const {
    campaigns,
    activeCampaignId,
    nodes,
    links,
    pins,
    activeNodeId,
    mode,
    openNode,
    createNode,
    togglePin,
    setMode,
  } = useCampaignManagerStore(
    useShallow((state) => ({
      campaigns: state.campaigns,
      activeCampaignId: state.activeCampaignId,
      nodes: state.nodes,
      links: state.links,
      pins: state.pins,
      activeNodeId: state.activeNodeId,
      mode: state.mode,
      openNode: state.openNode,
      createNode: state.createNode,
      togglePin: state.togglePin,
      setMode: state.setMode,
    })),
  )

  const activeCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === activeCampaignId) ?? null,
    [activeCampaignId, campaigns],
  )
  const activeNode = useMemo(() => findNodeById(nodes, activeNodeId), [activeNodeId, nodes])

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

  const createInParent = useCallback(
    (parentId: string, kind: CreateCampaignNodeKind) => {
      const parent = findNodeById(nodes, parentId)

      if (!activeCampaignId || !parent) {
        return
      }

      void createNode({
        campaignId: activeCampaignId,
        parentId,
        kind,
        bucket: bucketForKind(kind, parent),
        title: DEFAULT_TITLES[kind],
      })
    },
    [activeCampaignId, createNode, nodes],
  )

  return (
    <div className="flex h-full flex-col overflow-hidden">
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
        <GraphMode nodes={nodes} links={links} onOpen={handleOpen} />
      ) : (
        <div className="min-h-0 flex-1 overflow-x-auto">
          <div className="grid h-full min-w-[56rem] grid-cols-[18rem_minmax(21rem,1fr)_17rem]">
            <CampaignTree
              nodes={nodes}
              activeNodeId={activeNodeId}
              onOpen={handleOpen}
              onCreate={createInParent}
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
