import { FileText, Folder, FolderOpen, Plus, Table2 } from 'lucide-react'
import { useMemo } from 'react'
import {
  buildCampaignTree,
  isOpenableCampaignNode,
  type CampaignNode,
  type CampaignNodeKind,
  type CampaignTreeNode,
} from '@/entities/campaign'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { ScrollArea } from '@/shared/ui/scroll-area'

type CreateCampaignNodeKind = Exclude<CampaignNodeKind, 'bucket'>

interface CampaignTreeProps {
  nodes: CampaignNode[]
  activeNodeId: string | null
  onOpen: (nodeId: string) => void
  onCreate: (parentId: string, kind?: CreateCampaignNodeKind) => void
}

interface CampaignTreeRowsProps extends Omit<CampaignTreeProps, 'nodes'> {
  treeNodes: CampaignTreeNode[]
  depth: number
}

function iconForNode(node: CampaignTreeNode) {
  if (node.kind === 'table') {
    return Table2
  }

  if (node.kind === 'bucket') {
    return FolderOpen
  }

  if (node.kind === 'folder') {
    return node.children.length > 0 ? FolderOpen : Folder
  }

  return FileText
}

function canCreateChild(node: CampaignTreeNode): boolean {
  return node.kind === 'bucket' || node.kind === 'folder'
}

interface CampaignTreeRowLabelProps {
  node: CampaignTreeNode
  openable: boolean
  onOpen: (nodeId: string) => void
}

function CampaignTreeRowLabel({ node, openable, onOpen }: CampaignTreeRowLabelProps) {
  const Icon = iconForNode(node)
  const className = 'flex min-w-0 flex-1 items-center gap-2 text-left'

  if (!openable) {
    return (
      <div className={className}>
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{node.title}</span>
      </div>
    )
  }

  return (
    <button type="button" className={className} onClick={() => onOpen(node.id)}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{node.title}</span>
    </button>
  )
}

function CampaignTreeRows({
  treeNodes,
  activeNodeId,
  onOpen,
  onCreate,
  depth,
}: CampaignTreeRowsProps) {
  return (
    <>
      {treeNodes.map((node) => {
        const openable = isOpenableCampaignNode(node)
        const isActive = node.id === activeNodeId
        const indent = `${depth * 0.875}rem`

        return (
          <div key={node.id}>
            <div
              className={cn(
                'group flex h-8 items-center gap-1 rounded-md px-1.5 text-sm',
                isActive && 'bg-secondary text-secondary-foreground',
                !isActive && 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
              style={{ paddingLeft: `calc(0.375rem + ${indent})` }}
            >
              <CampaignTreeRowLabel node={node} openable={openable} onOpen={onOpen} />
              {canCreateChild(node) ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  onClick={() => onCreate(node.id)}
                  aria-label={`Create child in ${node.title}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
            {node.children.length > 0 ? (
              <CampaignTreeRows
                treeNodes={node.children}
                activeNodeId={activeNodeId}
                onOpen={onOpen}
                onCreate={onCreate}
                depth={depth + 1}
              />
            ) : null}
          </div>
        )
      })}
    </>
  )
}

export function CampaignTree({ nodes, activeNodeId, onOpen, onCreate }: CampaignTreeProps) {
  const treeNodes = useMemo(() => buildCampaignTree(nodes), [nodes])

  return (
    <ScrollArea className="h-full border-r border-border/50 p-3">
      <div className="mb-2 px-1 text-xs font-semibold uppercase text-muted-foreground">
        Files
      </div>
      <CampaignTreeRows
        treeNodes={treeNodes}
        activeNodeId={activeNodeId}
        onOpen={onOpen}
        onCreate={onCreate}
        depth={0}
      />
    </ScrollArea>
  )
}
