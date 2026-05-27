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

export interface FilteredCampaignGraphInput {
  nodes: CampaignNode[]
  links: CampaignLink[]
  matchingNodeIds: Set<string>
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

function normalizeGraphQuery(value: string): string {
  return value.trim().toLocaleLowerCase()
}

export function filterCampaignGraphInput(
  nodes: CampaignNode[],
  links: CampaignLink[],
  query: string,
): FilteredCampaignGraphInput {
  const normalizedQuery = normalizeGraphQuery(query)

  if (!normalizedQuery) {
    return {
      nodes,
      links,
      matchingNodeIds: new Set(),
    }
  }

  const openableNodes = nodes.filter(isOpenableCampaignNode)
  const openableNodeIds = new Set(openableNodes.map((node) => node.id))
  const matchingNodeIds = new Set(
    openableNodes
      .filter((node) => node.title.toLocaleLowerCase().includes(normalizedQuery))
      .map((node) => node.id),
  )

  if (matchingNodeIds.size === 0) {
    return {
      nodes: [],
      links: [],
      matchingNodeIds,
    }
  }

  const includedNodeIds = new Set(matchingNodeIds)
  let hasOutgoingMatches = false

  for (const link of links) {
    if (!openableNodeIds.has(link.sourceNodeId) || !openableNodeIds.has(link.targetNodeId)) {
      continue
    }

    if (matchingNodeIds.has(link.sourceNodeId)) {
      includedNodeIds.add(link.targetNodeId)
      hasOutgoingMatches = true
    }
  }

  if (!hasOutgoingMatches) {
    for (const link of links) {
      if (!openableNodeIds.has(link.sourceNodeId) || !openableNodeIds.has(link.targetNodeId)) {
        continue
      }

      if (matchingNodeIds.has(link.targetNodeId)) {
        includedNodeIds.add(link.sourceNodeId)
      }
    }
  }

  return {
    nodes: openableNodes.filter((node) => includedNodeIds.has(node.id)),
    links: links.filter(
      (link) => includedNodeIds.has(link.sourceNodeId) && includedNodeIds.has(link.targetNodeId),
    ),
    matchingNodeIds,
  }
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
