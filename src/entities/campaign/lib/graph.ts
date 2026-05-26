import type { CampaignLink, CampaignNode, CampaignNodeKind } from '../model/types'
import { isOpenableCampaignNode } from './tree'

export interface CampaignGraphNode {
  id: string
  title: string
  kind: CampaignNodeKind
  degree: number
  x: number
  y: number
}

export interface CampaignGraphEdge {
  id: string
  sourceNodeId: string
  targetNodeId: string
}

export interface CampaignGraph {
  nodes: CampaignGraphNode[]
  edges: CampaignGraphEdge[]
}

const GRAPH_CENTER_X = 360
const GRAPH_CENTER_Y = 240
const GRAPH_RADIUS = 180

function compareGraphNodes(left: CampaignNode, right: CampaignNode): number {
  const orderDelta = left.sortOrder - right.sortOrder

  if (orderDelta !== 0) {
    return orderDelta
  }

  return left.title.localeCompare(right.title)
}

export function buildCampaignGraph(nodes: CampaignNode[], links: CampaignLink[]): CampaignGraph {
  const graphNodes = nodes.filter(isOpenableCampaignNode).sort(compareGraphNodes)
  const graphNodeIds = new Set(graphNodes.map((node) => node.id))
  const degreeMap = new Map<string, number>()
  const edges: CampaignGraphEdge[] = []

  for (const link of links) {
    if (!graphNodeIds.has(link.sourceNodeId) || !graphNodeIds.has(link.targetNodeId)) {
      continue
    }

    edges.push({
      id: link.id,
      sourceNodeId: link.sourceNodeId,
      targetNodeId: link.targetNodeId,
    })

    degreeMap.set(link.sourceNodeId, (degreeMap.get(link.sourceNodeId) ?? 0) + 1)
    degreeMap.set(link.targetNodeId, (degreeMap.get(link.targetNodeId) ?? 0) + 1)
  }

  return {
    nodes: graphNodes.map((node, index) => {
      const angle = (2 * Math.PI * index) / Math.max(graphNodes.length, 1)

      return {
        id: node.id,
        title: node.title,
        kind: node.kind,
        degree: degreeMap.get(node.id) ?? 0,
        x: GRAPH_CENTER_X + GRAPH_RADIUS * Math.cos(angle),
        y: GRAPH_CENTER_Y + GRAPH_RADIUS * Math.sin(angle),
      }
    }),
    edges,
  }
}
