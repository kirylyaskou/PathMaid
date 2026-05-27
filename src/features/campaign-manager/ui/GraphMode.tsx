import { Search, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type WheelEvent,
} from 'react'
import {
  buildCampaignGraph,
  filterCampaignGraphInput,
  isOpenableCampaignNode,
  type CampaignGraphNode,
  type CampaignLink,
  type CampaignNode,
  type CampaignNodeKind,
} from '@/entities/campaign'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

type ColoredCampaignNodeKind = Extract<
  CampaignNodeKind,
  'note' | 'table' | 'npc' | 'item' | 'location'
>

interface GraphModeProps {
  nodes: CampaignNode[]
  links: CampaignLink[]
  onOpen: (nodeId: string) => void
}

const COLOR_BY_KIND: Record<ColoredCampaignNodeKind, string> = {
  note: '#4f7cff',
  table: '#22a699',
  npc: '#c75cff',
  item: '#f29f05',
  location: '#4caf50',
}

function colorForKind(kind: CampaignNodeKind): string {
  if (kind in COLOR_BY_KIND) {
    return COLOR_BY_KIND[kind as ColoredCampaignNodeKind]
  }

  return '#64748b'
}

function graphNodeRadius(node: CampaignGraphNode): number {
  return 22 + Math.min(node.degree, 8) * 4
}

function graphNodeLabel(node: CampaignGraphNode): string {
  if (node.title.length <= 14) {
    return node.title
  }

  return `${node.title.slice(0, 13)}...`
}

function readNodeId(
  event:
    | FocusEvent<SVGGElement>
    | KeyboardEvent<SVGGElement>
    | MouseEvent<SVGGElement | HTMLButtonElement>,
): string | null {
  return event.currentTarget.dataset.nodeId ?? null
}

export function GraphMode({ nodes, links, onOpen }: GraphModeProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)
  const [filterQuery, setFilterQuery] = useState('')
  const [zoom, setZoom] = useState(1)

  const filteredInput = useMemo(
    () => filterCampaignGraphInput(nodes, links, filterQuery),
    [filterQuery, links, nodes],
  )
  const graph = useMemo(
    () => buildCampaignGraph(filteredInput.nodes, filteredInput.links),
    [filteredInput.links, filteredInput.nodes],
  )
  const graphNodeById = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph.nodes],
  )
  const visibleNodeIds = useMemo(() => new Set(graph.nodes.map((node) => node.id)), [graph.nodes])
  const openableNodeCount = useMemo(() => nodes.filter(isOpenableCampaignNode).length, [nodes])
  const filterActive = filterQuery.trim().length > 0
  const selectedNode = useMemo(
    () => (selectedNodeId ? graphNodeById.get(selectedNodeId) ?? null : null),
    [graphNodeById, selectedNodeId],
  )

  useEffect(() => {
    if (selectedNodeId && !visibleNodeIds.has(selectedNodeId)) {
      setSelectedNodeId(null)
    }

    if (focusedNodeId && !visibleNodeIds.has(focusedNodeId)) {
      setFocusedNodeId(null)
    }
  }, [focusedNodeId, selectedNodeId, visibleNodeIds])

  const handleSelectNode = useCallback((event: MouseEvent<SVGGElement>) => {
    setSelectedNodeId(readNodeId(event))
  }, [])

  const handleFocusNode = useCallback((event: FocusEvent<SVGGElement>) => {
    const nodeId = readNodeId(event)

    setFocusedNodeId(nodeId)
    setSelectedNodeId(nodeId)
  }, [])

  const handleBlurNode = useCallback(() => {
    setFocusedNodeId(null)
  }, [])

  const handleOpenNode = useCallback(
    (event: MouseEvent<SVGGElement>) => {
      const nodeId = readNodeId(event)

      if (nodeId) {
        onOpen(nodeId)
      }
    },
    [onOpen],
  )

  const handleNodeKeyDown = useCallback(
    (event: KeyboardEvent<SVGGElement>) => {
      const nodeId = readNodeId(event)

      if (!nodeId) {
        return
      }

      if (event.key === 'Enter') {
        onOpen(nodeId)
        return
      }

      if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault()
        setSelectedNodeId(nodeId)
      }
    },
    [onOpen],
  )

  const handleOpenSelectedNode = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const nodeId = readNodeId(event)

      if (nodeId) {
        onOpen(nodeId)
      }
    },
    [onOpen],
  )

  const handleWheelZoom = useCallback((event: WheelEvent<Element>) => {
    event.preventDefault()
    event.stopPropagation()
    const direction = event.deltaY > 0 ? -1 : 1
    setZoom((currentZoom) => {
      const nextZoom = currentZoom + direction * 0.12
      return Math.min(2.5, Math.max(0.45, nextZoom))
    })
  }, [])

  const handleResetZoom = useCallback(() => {
    setZoom(1)
  }, [])

  const handleClearFilter = useCallback(() => {
    setFilterQuery('')
  }, [])

  return (
    <div
      className="grid min-h-0 flex-1 grid-cols-[minmax(36rem,1fr)_18rem] overflow-x-auto"
      onWheelCapture={handleWheelZoom}
    >
      <div className="min-w-[36rem] p-4">
        <svg
          role="img"
          aria-label="Campaign document graph"
          viewBox="0 0 720 480"
          className="h-full min-h-[28rem] w-full rounded-md border border-border/50 bg-slate-950"
          onWheel={handleWheelZoom}
        >
          <rect width="720" height="480" fill="#020617" />
          <g transform={`translate(360 240) scale(${zoom}) translate(-360 -240)`}>
            {graph.edges.map((edge) => {
              const source = graphNodeById.get(edge.sourceNodeId)
              const target = graphNodeById.get(edge.targetNodeId)

              if (!source || !target) {
                return null
              }

              return (
                <line
                  key={edge.id}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke="#64748b"
                  strokeOpacity="0.55"
                  strokeWidth="2"
                />
              )
            })}
            {graph.nodes.map((node) => {
              const radius = graphNodeRadius(node)
              const selected = node.id === selectedNodeId
              const focused = node.id === focusedNodeId
              const matched = filterActive && filteredInput.matchingNodeIds.has(node.id)

              return (
                <g
                  key={node.id}
                  data-node-id={node.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`Select ${node.title} ${node.kind} node`}
                  className="cursor-pointer"
                  onClick={handleSelectNode}
                  onDoubleClick={handleOpenNode}
                  onFocus={handleFocusNode}
                  onBlur={handleBlurNode}
                  onKeyDown={handleNodeKeyDown}
                >
                  {focused ? (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={radius + 7}
                      fill="none"
                      stroke="#facc15"
                      strokeWidth="3"
                    />
                  ) : null}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={radius}
                    fill={colorForKind(node.kind)}
                    opacity="0.92"
                    stroke={selected ? '#f8fafc' : matched ? '#facc15' : '#0f172a'}
                    strokeWidth={selected || matched ? 4 : 2}
                  />
                  <text
                    x={node.x}
                    y={node.y + 4}
                    textAnchor="middle"
                    className="select-none fill-white text-[12px] font-semibold"
                  >
                    {graphNodeLabel(node)}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>
      </div>
      <aside className="min-w-[18rem] border-l border-border/50 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Graph</h2>
          <Button type="button" variant="outline" size="sm" onClick={handleResetZoom}>
            {Math.round(zoom * 100)}%
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filterQuery}
              onChange={(event) => setFilterQuery(event.target.value)}
              placeholder="Filter graph..."
              aria-label="Filter graph"
              className="h-8 pr-9 pl-8"
            />
            {filterActive ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-0 top-0"
                aria-label="Clear graph filter"
                onClick={handleClearFilter}
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground">
            {graph.nodes.length} / {openableNodeCount} nodes
          </div>
        </div>
        {selectedNode ? (
          <div className="mt-4 space-y-3">
            <div>
              <div className="text-base font-semibold">{selectedNode.title}</div>
              <div className="mt-1 text-xs uppercase text-muted-foreground">{selectedNode.kind}</div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-center"
              data-node-id={selectedNode.id}
              onClick={handleOpenSelectedNode}
            >
              Open document
            </Button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            {filterActive && graph.nodes.length === 0
              ? 'No matching graph nodes.'
              : 'Select a document node to inspect its links.'}
          </p>
        )}
      </aside>
    </div>
  )
}
