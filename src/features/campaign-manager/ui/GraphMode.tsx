import { useCallback, useMemo, useState, type MouseEvent } from 'react'
import {
  buildCampaignGraph,
  type CampaignGraphNode,
  type CampaignLink,
  type CampaignNode,
  type CampaignNodeKind,
} from '@/entities/campaign'
import { Button } from '@/shared/ui/button'

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

function readNodeId(event: MouseEvent<SVGGElement | HTMLButtonElement>): string | null {
  return event.currentTarget.dataset.nodeId ?? null
}

export function GraphMode({ nodes, links, onOpen }: GraphModeProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const graph = useMemo(() => buildCampaignGraph(nodes, links), [links, nodes])
  const graphNodeById = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph.nodes],
  )
  const selectedNode = useMemo(
    () => (selectedNodeId ? graphNodeById.get(selectedNodeId) ?? null : null),
    [graphNodeById, selectedNodeId],
  )

  const handleSelectNode = useCallback((event: MouseEvent<SVGGElement>) => {
    setSelectedNodeId(readNodeId(event))
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

  const handleOpenSelectedNode = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const nodeId = readNodeId(event)

      if (nodeId) {
        onOpen(nodeId)
      }
    },
    [onOpen],
  )

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(36rem,1fr)_18rem] overflow-x-auto">
      <div className="min-w-[36rem] p-4">
        <svg
          role="img"
          aria-label="Campaign document graph"
          viewBox="0 0 720 480"
          className="h-full min-h-[28rem] w-full rounded-md border border-border/50 bg-slate-950"
        >
          <rect width="720" height="480" fill="#020617" />
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

            return (
              <g
                key={node.id}
                data-node-id={node.id}
                tabIndex={0}
                role="button"
                className="cursor-pointer outline-none"
                onClick={handleSelectNode}
                onDoubleClick={handleOpenNode}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={radius}
                  fill={colorForKind(node.kind)}
                  opacity="0.92"
                  stroke={selected ? '#f8fafc' : '#0f172a'}
                  strokeWidth={selected ? 4 : 2}
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
        </svg>
      </div>
      <aside className="min-w-[18rem] border-l border-border/50 p-4">
        <h2 className="text-sm font-semibold">Graph</h2>
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
            Select a document node to inspect its links.
          </p>
        )}
      </aside>
    </div>
  )
}
