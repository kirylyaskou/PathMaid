import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderPlus,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Plus,
  Table2,
  Trash2,
} from 'lucide-react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useCallback, useMemo, useState } from 'react'
import {
  buildCampaignTree,
  isOpenableCampaignNode,
  type CampaignNode,
  type CampaignNodeKind,
  type CampaignTreeNode,
} from '@/entities/campaign'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Input } from '@/shared/ui/input'
import { ScrollArea } from '@/shared/ui/scroll-area'

type CreateCampaignNodeKind = Exclude<CampaignNodeKind, 'bucket'>

interface CampaignTreeProps {
  nodes: CampaignNode[]
  activeNodeId: string | null
  onOpen: (nodeId: string) => void
  onCreate: (parentId: string | null, kind?: CreateCampaignNodeKind) => void
  onRename: (nodeId: string, title: string) => void
  onDelete: (nodeId: string) => void
  onMove: (nodeId: string, parentId: string | null) => void
}

interface CampaignTreeRowsProps extends Omit<CampaignTreeProps, 'nodes'> {
  treeNodes: CampaignTreeNode[]
  depth: number
  editingNodeId: string | null
  renameDraft: string
  draggedNodeId: string | null
  collapsedNodeIds: ReadonlySet<string>
  onStartRename: (node: CampaignTreeNode) => void
  onRenameDraftChange: (title: string) => void
  onCommitRename: (nodeId: string) => void
  onCancelRename: () => void
  onToggleCollapse: (nodeId: string) => void
}

interface CampaignTreeRowProps extends Omit<CampaignTreeRowsProps, 'treeNodes'> {
  node: CampaignTreeNode
}

interface CampaignTreeRowLabelProps {
  node: CampaignTreeNode
  openable: boolean
  editing: boolean
  renameDraft: string
  onOpen: (nodeId: string) => void
  onToggleCollapse: (nodeId: string) => void
  onRenameDraftChange: (title: string) => void
  onCommitRename: (nodeId: string) => void
  onCancelRename: () => void
}

interface CampaignTreeNodeActionsProps {
  node: CampaignTreeNode
  onCreate: (parentId: string | null, kind?: CreateCampaignNodeKind) => void
  onStartRename: (node: CampaignTreeNode) => void
  onDelete: (nodeId: string) => void
}

interface CampaignTreeRootDropProps {
  activeDragNodeId: string | null
}

function iconForNode(node: CampaignTreeNode) {
  if (node.kind === 'table') {
    return Table2
  }

  if (node.kind === 'bucket') {
    return Folder
  }

  if (node.kind === 'folder') {
    return Folder
  }

  return FileText
}

function canCreateChild(node: CampaignTreeNode): boolean {
  return node.kind === 'bucket' || node.kind === 'folder'
}

function CampaignTreeRowLabel({
  node,
  openable,
  editing,
  renameDraft,
  onOpen,
  onToggleCollapse,
  onRenameDraftChange,
  onCommitRename,
  onCancelRename,
}: CampaignTreeRowLabelProps) {
  const Icon = iconForNode(node)
  const className = 'flex min-w-0 flex-1 items-center gap-2 text-left'

  if (editing) {
    return (
      <div className={className}>
        <Icon className="h-4 w-4 shrink-0" />
        <Input
          autoFocus
          value={renameDraft}
          onChange={(event) => onRenameDraftChange(event.target.value)}
          onBlur={() => onCommitRename(node.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur()
            } else if (event.key === 'Escape') {
              event.preventDefault()
              onCancelRename()
            }
          }}
          onMouseDown={(event) => event.stopPropagation()}
          className="h-7 border-input bg-background px-2 text-sm"
          aria-label={`Rename ${node.title}`}
        />
      </div>
    )
  }

  if (!openable) {
    return (
      <button type="button" className={className} onClick={() => onToggleCollapse(node.id)}>
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{node.title}</span>
      </button>
    )
  }

  return (
    <button type="button" className={className} onClick={() => onOpen(node.id)}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{node.title}</span>
    </button>
  )
}

function CampaignTreeRootDrop({ activeDragNodeId }: CampaignTreeRootDropProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'campaign-tree-root-drop',
    data: { parentId: null },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'mt-2 h-8 rounded-md border border-dashed border-transparent',
        activeDragNodeId && 'border-border/70',
        isOver && 'border-primary/70 bg-primary/10',
      )}
    />
  )
}

type DraggableAttributes = ReturnType<typeof useDraggable>['attributes']
type DraggableListeners = ReturnType<typeof useDraggable>['listeners']

function CampaignTreeDragHandle({
  node,
  attributes,
  listeners,
}: {
  node: CampaignTreeNode
  attributes: DraggableAttributes
  listeners: DraggableListeners
}) {
  if (node.isSystem) {
    return <span className="h-4 w-3 shrink-0" />
  }

  return (
    <span
      className="flex h-5 w-3 shrink-0 cursor-grab items-center justify-center text-muted-foreground/60 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
      title={`Move ${node.title}`}
      aria-label={`Move ${node.title}`}
      onMouseDown={(event) => event.stopPropagation()}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-3.5 w-3.5" />
    </span>
  )
}

function CampaignTreeNodeActions({
  node,
  onCreate,
  onStartRename,
  onDelete,
}: CampaignTreeNodeActionsProps) {
  const canEdit = !node.isSystem

  return (
    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
      {canCreateChild(node) ? (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-6 w-6"
            onMouseDown={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onCreate(node.id)
            }}
            onClick={(event) => {
              event.stopPropagation()
              if (event.detail === 0) {
                onCreate(node.id)
              }
            }}
            aria-label={`Create file in ${node.title}`}
            title="Create file"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-6 w-6"
            onMouseDown={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onCreate(node.id, 'folder')
            }}
            onClick={(event) => {
              event.stopPropagation()
              if (event.detail === 0) {
                onCreate(node.id, 'folder')
              }
            }}
            aria-label={`Create folder in ${node.title}`}
            title="Create folder"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
        </>
      ) : null}
      {canEdit ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6"
              onMouseDown={(event) => event.stopPropagation()}
              aria-label={`Actions for ${node.title}`}
              title="Actions"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onStartRename(node)}>
              <Pencil className="h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                if (window.confirm(`Delete "${node.title}"?`)) {
                  onDelete(node.id)
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}

function CampaignTreeRow({
  node,
  activeNodeId,
  onOpen,
  onCreate,
  onRename,
  onDelete,
  onMove,
  depth,
  editingNodeId,
  renameDraft,
  draggedNodeId,
  collapsedNodeIds,
  onStartRename,
  onRenameDraftChange,
  onCommitRename,
  onCancelRename,
  onToggleCollapse,
}: CampaignTreeRowProps) {
  const openable = isOpenableCampaignNode(node)
  const isActive = node.id === activeNodeId
  const collapsible = canCreateChild(node)
  const isCollapsed = collapsedNodeIds.has(node.id)
  const isDropTarget =
    draggedNodeId !== null && draggedNodeId !== node.id && canCreateChild(node)
  const indent = `${depth * 0.875}rem`
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
    isDragging,
  } = useDraggable({
    id: node.id,
    disabled: node.isSystem,
    data: { nodeId: node.id },
  })
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `campaign-tree-drop-${node.id}`,
    disabled: !canCreateChild(node),
    data: { parentId: node.id },
  })
  const setRowRef = useCallback(
    (element: HTMLDivElement | null) => {
      setDraggableRef(element)
      setDroppableRef(element)
    },
    [setDraggableRef, setDroppableRef],
  )

  return (
    <div>
      <div
        ref={setRowRef}
        className={cn(
          'group flex h-8 items-center gap-1 rounded-md px-1.5 text-sm',
          isActive && 'bg-secondary text-secondary-foreground',
          !isActive && 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          isDropTarget && 'ring-1 ring-primary/60',
          isOver && 'bg-primary/10',
          isDragging && 'opacity-50',
        )}
        style={{
          paddingLeft: `calc(0.375rem + ${indent})`,
          transform: CSS.Translate.toString(transform),
        }}
      >
        <CampaignTreeDragHandle node={node} attributes={attributes} listeners={listeners} />
        {collapsible ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-5 w-5 shrink-0"
            onClick={() => onToggleCollapse(node.id)}
            aria-label={isCollapsed ? `Expand ${node.title}` : `Collapse ${node.title}`}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        ) : (
          <span className="h-5 w-5 shrink-0" />
        )}
        <CampaignTreeRowLabel
          node={node}
          openable={openable}
          editing={editingNodeId === node.id}
          renameDraft={renameDraft}
          onOpen={onOpen}
          onToggleCollapse={onToggleCollapse}
          onRenameDraftChange={onRenameDraftChange}
          onCommitRename={onCommitRename}
          onCancelRename={onCancelRename}
        />
        <CampaignTreeNodeActions
          node={node}
          onCreate={onCreate}
          onStartRename={onStartRename}
          onDelete={onDelete}
        />
      </div>
      {node.children.length > 0 && !isCollapsed ? (
        <CampaignTreeRows
          treeNodes={node.children}
          activeNodeId={activeNodeId}
          onOpen={onOpen}
          onCreate={onCreate}
          onRename={onRename}
          onDelete={onDelete}
          onMove={onMove}
          depth={depth + 1}
          editingNodeId={editingNodeId}
          renameDraft={renameDraft}
          draggedNodeId={draggedNodeId}
          collapsedNodeIds={collapsedNodeIds}
          onStartRename={onStartRename}
          onRenameDraftChange={onRenameDraftChange}
          onCommitRename={onCommitRename}
          onCancelRename={onCancelRename}
          onToggleCollapse={onToggleCollapse}
        />
      ) : null}
    </div>
  )
}

function CampaignTreeRows({ treeNodes, ...props }: CampaignTreeRowsProps) {
  return (
    <>
      {treeNodes.map((node) => (
        <CampaignTreeRow key={node.id} node={node} {...props} />
      ))}
    </>
  )
}

export function CampaignTree({
  nodes,
  activeNodeId,
  onOpen,
  onCreate,
  onRename,
  onDelete,
  onMove,
}: CampaignTreeProps) {
  const treeNodes = useMemo(() => buildCampaignTree(nodes), [nodes])
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [activeDragNodeId, setActiveDragNodeId] = useState<string | null>(null)
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(() => new Set())
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
  )

  const startRename = (node: CampaignTreeNode) => {
    setEditingNodeId(node.id)
    setRenameDraft(node.title)
  }

  const commitRename = (nodeId: string) => {
    const title = renameDraft.trim()
    setEditingNodeId(null)
    setRenameDraft('')
    if (title.length > 0) {
      onRename(nodeId, title)
    }
  }

  const cancelRename = () => {
    setEditingNodeId(null)
    setRenameDraft('')
  }

  const toggleCollapse = (nodeId: string) => {
    setCollapsedNodeIds((current) => {
      const next = new Set(current)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragNodeId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const movedNodeId = String(event.active.id)
    const parentId = event.over?.data.current?.parentId as string | null | undefined
    setActiveDragNodeId(null)

    if (parentId !== undefined && movedNodeId !== parentId) {
      onMove(movedNodeId, parentId)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDragNodeId(null)}
    >
      <ScrollArea className="h-full border-r border-border/50 p-3">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Files</div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6"
              onClick={() => onCreate(null, 'note')}
              aria-label="Create root note"
              title="Create root note"
            >
              <FileText className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6"
              onClick={() => onCreate(null, 'table')}
              aria-label="Create root table"
              title="Create root table"
            >
              <Table2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6"
              onClick={() => onCreate(null, 'folder')}
              aria-label="Create root folder"
              title="Create root folder"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <CampaignTreeRows
          treeNodes={treeNodes}
          activeNodeId={activeNodeId}
          onOpen={onOpen}
          onCreate={onCreate}
          onRename={onRename}
          onDelete={onDelete}
          onMove={onMove}
          depth={0}
          editingNodeId={editingNodeId}
          renameDraft={renameDraft}
          draggedNodeId={activeDragNodeId}
          collapsedNodeIds={collapsedNodeIds}
          onStartRename={startRename}
          onRenameDraftChange={setRenameDraft}
          onCommitRename={commitRename}
          onCancelRename={cancelRename}
          onToggleCollapse={toggleCollapse}
        />
        <CampaignTreeRootDrop activeDragNodeId={activeDragNodeId} />
      </ScrollArea>
    </DndContext>
  )
}
