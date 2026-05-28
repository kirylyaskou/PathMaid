import { Search, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
  graphPositions: Record<string, { x: number; y: number }>
  onOpen: (nodeId: string) => void
  onNodePositionChange: (nodeId: string, position: { x: number; y: number }) => void
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

function graphNodeLabel(node: CampaignGraphNode): string {
  if (node.title.length <= 22) {
    return node.title
  }

  return `${node.title.slice(0, 21)}...`
}

function graphEdgeStrokeWidth(weight: number): number {
  return 1.5 + Math.min(weight, 5) * 0.65
}

function graphEdgeStrokeOpacity(weight: number): number {
  return 0.4 + Math.min(weight, 5) * 0.08
}

function readNodeId(
  event:
    | FocusEvent<SVGGElement>
    | KeyboardEvent<SVGGElement>
    | MouseEvent<SVGGElement | HTMLButtonElement>,
): string | null {
  return event.currentTarget.dataset.nodeId ?? null
}

export function GraphMode({
  nodes,
  links,
  graphPositions,
  onOpen,
  onNodePositionChange,
}: GraphModeProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const stopGraphNodeDragRef = useRef<(() => void) | null>(null)
  const stopGraphPanRef = useRef<(() => void) | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)
  const [filterQuery, setFilterQuery] = useState('')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [panning, setPanning] = useState(false)
  const [manualPositions, setManualPositions] = useState<Record<string, { x: number; y: number }>>(
    graphPositions,
  )

  const filteredInput = useMemo(
    () => filterCampaignGraphInput(nodes, links, filterQuery),
    [filterQuery, links, nodes],
  )
  const graph = useMemo(
    () => buildCampaignGraph(filteredInput.nodes, filteredInput.links),
    [filteredInput.links, filteredInput.nodes],
  )
  const displayGraphNodes = useMemo(
    () =>
      graph.nodes.map((node) => ({
        ...node,
        ...(manualPositions[node.id] ?? {}),
      })),
    [graph.nodes, manualPositions],
  )
  const graphNodeById = useMemo(
    () => new Map(displayGraphNodes.map((node) => [node.id, node])),
    [displayGraphNodes],
  )
  const visibleNodeIds = useMemo(
    () => new Set(displayGraphNodes.map((node) => node.id)),
    [displayGraphNodes],
  )
  const openableNodeCount = useMemo(() => nodes.filter(isOpenableCampaignNode).length, [nodes])
  const filterActive = filterQuery.trim().length > 0
  const selectedNode = useMemo(
    () => (selectedNodeId ? graphNodeById.get(selectedNodeId) ?? null : null),
    [graphNodeById, selectedNodeId],
  )

  useEffect(() => {
    setManualPositions(graphPositions)
  }, [graphPositions])

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

  const clientPointToGraphPoint = useCallback(
    (svg: SVGSVGElement, clientX: number, clientY: number) => {
      const rect = svg.getBoundingClientRect()
      const svgX = ((clientX - rect.left) / rect.width) * graph.width
      const svgY = ((clientY - rect.top) / rect.height) * graph.height

      return {
        x: graph.centerX + (svgX - pan.x - graph.centerX) / zoom,
        y: graph.centerY + (svgY - pan.y - graph.centerY) / zoom,
      }
    },
    [graph.centerX, graph.centerY, graph.height, graph.width, pan.x, pan.y, zoom],
  )

  const startGraphNodeDrag = useCallback(
    (nodeId: string, clientX: number, clientY: number) => {
      const svg = svgRef.current

      stopGraphNodeDragRef.current?.()
      stopGraphPanRef.current?.()
      setSelectedNodeId(nodeId)
      setDraggedNodeId(nodeId)

      if (!svg) {
        return
      }

      const startPoint = clientPointToGraphPoint(svg, clientX, clientY)
      const startNode = graphNodeById.get(nodeId)
      const pointerOffset = {
        x: startPoint.x - (startNode?.x ?? startPoint.x),
        y: startPoint.y - (startNode?.y ?? startPoint.y),
      }
      let latestPosition: { x: number; y: number } | null = null

      const handleWindowMouseMove = (moveEvent: globalThis.MouseEvent) => {
        const point = clientPointToGraphPoint(svg, moveEvent.clientX, moveEvent.clientY)
        const position = {
          x: point.x - pointerOffset.x,
          y: point.y - pointerOffset.y,
        }
        latestPosition = position
        setManualPositions((current) => ({
          ...current,
          [nodeId]: position,
        }))
      }
      const handleWindowMouseUp = () => {
        stopGraphNodeDragRef.current?.()
        if (latestPosition) {
          onNodePositionChange(nodeId, latestPosition)
        }
        setDraggedNodeId(null)
      }
      stopGraphNodeDragRef.current = () => {
        window.removeEventListener('mousemove', handleWindowMouseMove)
        window.removeEventListener('mouseup', handleWindowMouseUp)
        stopGraphNodeDragRef.current = null
      }

      window.addEventListener('mousemove', handleWindowMouseMove)
      window.addEventListener('mouseup', handleWindowMouseUp)
    },
    [clientPointToGraphPoint, graphNodeById, onNodePositionChange],
  )

  const startGraphPan = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current

      stopGraphPanRef.current?.()
      stopGraphNodeDragRef.current?.()

      if (!svg) {
        return
      }

      const rect = svg.getBoundingClientRect()
      const startPan = pan
      setPanning(true)

      const handleWindowMouseMove = (moveEvent: globalThis.MouseEvent) => {
        const deltaX = ((moveEvent.clientX - clientX) / rect.width) * graph.width
        const deltaY = ((moveEvent.clientY - clientY) / rect.height) * graph.height

        setPan({
          x: startPan.x + deltaX,
          y: startPan.y + deltaY,
        })
      }
      const handleWindowMouseUp = () => {
        stopGraphPanRef.current?.()
        setPanning(false)
      }
      stopGraphPanRef.current = () => {
        window.removeEventListener('mousemove', handleWindowMouseMove)
        window.removeEventListener('mouseup', handleWindowMouseUp)
        stopGraphPanRef.current = null
      }

      window.addEventListener('mousemove', handleWindowMouseMove)
      window.addEventListener('mouseup', handleWindowMouseUp)
    },
    [graph.height, graph.width, pan],
  )

  useEffect(
    () => () => {
      stopGraphNodeDragRef.current?.()
      stopGraphPanRef.current?.()
    },
    [],
  )

  const handleGraphMouseDownCapture = useCallback(
    (event: MouseEvent<SVGSVGElement>) => {
      const target = event.target
      if (!(target instanceof Element)) {
        return
      }

      const nodeElement = target.closest<SVGGElement>('g[role="button"][data-node-id]')
      const nodeId = nodeElement?.dataset.nodeId
      if (!nodeId) {
        return
      }

      event.preventDefault()
      startGraphNodeDrag(nodeId, event.clientX, event.clientY)
    },
    [startGraphNodeDrag],
  )

  const handleGraphMouseDown = useCallback(
    (event: MouseEvent<SVGSVGElement>) => {
      if (event.button !== 0) {
        return
      }

      const target = event.target
      if (target instanceof Element && target.closest('g[role="button"][data-node-id]')) {
        return
      }

      event.preventDefault()
      startGraphPan(event.clientX, event.clientY)
    },
    [startGraphPan],
  )

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
      event.preventDefault()
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
    setPan({ x: 0, y: 0 })
  }, [])

  const handleClearFilter = useCallback(() => {
    setFilterQuery('')
  }, [])

  return (
    <div
      className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_18rem] overflow-hidden"
      onWheelCapture={handleWheelZoom}
    >
      <div className="min-h-0 min-w-0 p-4">
        <svg
          ref={svgRef}
          role="img"
          aria-label="Campaign document graph"
          viewBox={`0 0 ${graph.width} ${graph.height}`}
          className={`h-full min-h-0 w-full touch-none rounded-md border border-border/50 bg-slate-950 ${draggedNodeId || panning ? 'cursor-grabbing' : 'cursor-grab'}`}
          onWheel={handleWheelZoom}
          onMouseDownCapture={handleGraphMouseDownCapture}
          onMouseDown={handleGraphMouseDown}
        >
          <rect width={graph.width} height={graph.height} fill="#020617" />
          <g
            transform={`translate(${pan.x} ${pan.y}) translate(${graph.centerX} ${graph.centerY}) scale(${zoom}) translate(${-graph.centerX} ${-graph.centerY})`}
          >
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
                  strokeOpacity={graphEdgeStrokeOpacity(edge.weight)}
                  strokeWidth={graphEdgeStrokeWidth(edge.weight)}
                />
              )
            })}
            {displayGraphNodes.map((node) => {
              const selected = node.id === selectedNodeId
              const focused = node.id === focusedNodeId
              const matched = filterActive && filteredInput.matchingNodeIds.has(node.id)
              const frameColor = selected ? '#f8fafc' : matched ? '#facc15' : colorForKind(node.kind)
              const frameWidth = selected || matched ? 3 : 1.5

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
                    <rect
                      x={node.x - node.width / 2 - 5}
                      y={node.y - node.height / 2 - 5}
                      width={node.width + 10}
                      height={node.height + 10}
                      rx="8"
                      fill="none"
                      stroke="#facc15"
                      strokeWidth="2"
                    />
                  ) : null}
                  <rect
                    x={node.x - node.width / 2}
                    y={node.y - node.height / 2}
                    width={node.width}
                    height={node.height}
                    rx="7"
                    fill="#020617"
                    fillOpacity="0.94"
                    stroke={frameColor}
                    strokeOpacity="0.95"
                    strokeWidth={frameWidth}
                  />
                  <text
                    x={node.x}
                    y={node.y + 4}
                    textAnchor="middle"
                    className="select-none fill-white text-[12px] font-medium"
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
