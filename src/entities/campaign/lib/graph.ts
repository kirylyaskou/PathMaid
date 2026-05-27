import type { CampaignLink, CampaignNode, CampaignNodeKind } from '../model/types'
import { isOpenableCampaignNode } from './tree'

export interface CampaignGraphNode {
  id: string
  title: string
  kind: CampaignNodeKind
  degree: number
  width: number
  height: number
  x: number
  y: number
}

export interface CampaignGraphEdge {
  id: string
  sourceNodeId: string
  targetNodeId: string
  weight: number
}

export interface CampaignGraph {
  nodes: CampaignGraphNode[]
  edges: CampaignGraphEdge[]
  width: number
  height: number
  centerX: number
  centerY: number
}

export interface FilteredCampaignGraphInput {
  nodes: CampaignNode[]
  links: CampaignLink[]
  matchingNodeIds: Set<string>
}

const MIN_GRAPH_WIDTH = 720
const MIN_GRAPH_HEIGHT = 480
const GRAPH_PADDING = 48
const FORCE_ITERATIONS = 360
const COLLISION_PADDING = 42
const NODE_GRID_WIDTH = 190
const NODE_GRID_HEIGHT = 170
const NODE_MIN_WIDTH = 96
const NODE_MAX_WIDTH = 190
const NODE_HEIGHT = 34
const NODE_LABEL_MAX_LENGTH = 22
const NODE_LABEL_CHAR_WIDTH = 7.4
const MIN_SPRING_LENGTH = 180
const MAX_SPRING_LENGTH = 260
const SPRING_STRENGTH = 0.032
const REPULSION_STRENGTH = 5200
const COLLISION_STRENGTH = 0.42
const CENTER_STRENGTH = 0.006
const VELOCITY_DECAY = 0.74
const MAX_EDGE_WEIGHT_BONUS = 4

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

function hashNodeTitle(value: string): number {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function graphNodeWidth(title: string): number {
  const visibleLength = Math.min(title.length, NODE_LABEL_MAX_LENGTH)
  return clamp(visibleLength * NODE_LABEL_CHAR_WIDTH + 30, NODE_MIN_WIDTH, NODE_MAX_WIDTH)
}

function graphNodeCollisionRadius(width: number, height: number): number {
  return Math.sqrt(width * width + height * height) / 2
}

function graphLayoutSize(nodeCount: number): { width: number; height: number } {
  if (nodeCount === 0) {
    return {
      width: MIN_GRAPH_WIDTH,
      height: MIN_GRAPH_HEIGHT,
    }
  }

  const columns = Math.ceil(Math.sqrt(nodeCount * 1.35))
  const rows = Math.ceil(nodeCount / columns)

  return {
    width: Math.max(MIN_GRAPH_WIDTH, columns * NODE_GRID_WIDTH),
    height: Math.max(MIN_GRAPH_HEIGHT, rows * NODE_GRID_HEIGHT),
  }
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
  const { width, height } = graphLayoutSize(graphNodes.length)
  const centerX = width / 2
  const centerY = height / 2
  const graphNodeIds = new Set(graphNodes.map((node) => node.id))
  const degreeMap = new Map<string, number>()
  const edgeByKey = new Map<string, CampaignGraphEdge>()

  for (const link of links) {
    if (!graphNodeIds.has(link.sourceNodeId) || !graphNodeIds.has(link.targetNodeId)) {
      continue
    }

    const edgeKey =
      link.sourceNodeId < link.targetNodeId
        ? `${link.sourceNodeId}:${link.targetNodeId}`
        : `${link.targetNodeId}:${link.sourceNodeId}`

    const existingEdge = edgeByKey.get(edgeKey)
    if (existingEdge) {
      existingEdge.weight += 1
    } else {
      edgeByKey.set(edgeKey, {
        id: edgeKey,
        sourceNodeId: link.sourceNodeId,
        targetNodeId: link.targetNodeId,
        weight: 1,
      })
    }

    degreeMap.set(link.sourceNodeId, (degreeMap.get(link.sourceNodeId) ?? 0) + 1)
    degreeMap.set(link.targetNodeId, (degreeMap.get(link.targetNodeId) ?? 0) + 1)
  }

  const edges = [...edgeByKey.values()]
  const springLength = clamp(
    Math.sqrt(Math.max(graphNodes.length, 1)) * 36,
    MIN_SPRING_LENGTH,
    MAX_SPRING_LENGTH,
  )
  const positions = graphNodes.map((node, index) => {
    const hash = hashNodeTitle(node.id + node.title)
    const angle = ((hash % 3600) / 3600) * 2 * Math.PI
    const spiral = Math.sqrt((index + 1) / Math.max(graphNodes.length, 1))
    const radiusX = 64 + spiral * width * 0.36
    const radiusY = 48 + spiral * height * 0.36
    const nodeWidth = graphNodeWidth(node.title)
    const nodeRadius = graphNodeCollisionRadius(nodeWidth, NODE_HEIGHT)

    return {
      id: node.id,
      x: centerX + radiusX * Math.cos(angle),
      y: centerY + radiusY * Math.sin(angle),
      radius: nodeRadius,
      vx: 0,
      vy: 0,
    }
  })
  const positionById = new Map(positions.map((position) => [position.id, position]))

  for (let iteration = 0; iteration < FORCE_ITERATIONS; iteration += 1) {
    for (let leftIndex = 0; leftIndex < positions.length; leftIndex += 1) {
      const left = positions[leftIndex]
      if (!left) continue

      for (let rightIndex = leftIndex + 1; rightIndex < positions.length; rightIndex += 1) {
        const right = positions[rightIndex]
        if (!right) continue

        const dx = right.x - left.x || 0.01
        const dy = right.y - left.y || 0.01
        const distanceSquared = dx * dx + dy * dy
        const distance = Math.sqrt(distanceSquared)
        const minDistance = left.radius + right.radius + COLLISION_PADDING
        const collisionForce =
          distance < minDistance ? (minDistance - distance) * COLLISION_STRENGTH : 0
        const radiusScale = (left.radius + right.radius) / NODE_MAX_WIDTH
        const force =
          (REPULSION_STRENGTH * radiusScale) / Math.max(distanceSquared, 80) + collisionForce
        const fx = (dx / distance) * force
        const fy = (dy / distance) * force

        left.vx -= fx
        left.vy -= fy
        right.vx += fx
        right.vy += fy
      }
    }

    for (const edge of edges) {
      const source = positionById.get(edge.sourceNodeId)
      const target = positionById.get(edge.targetNodeId)
      if (!source || !target) continue

      const dx = target.x - source.x || 0.01
      const dy = target.y - source.y || 0.01
      const distance = Math.sqrt(dx * dx + dy * dy)
      const weightBonus = Math.min(edge.weight - 1, MAX_EDGE_WEIGHT_BONUS)
      const targetDistance =
        springLength - weightBonus * 14 + (source.radius + target.radius - NODE_MIN_WIDTH) * 0.5
      const force = (distance - targetDistance) * SPRING_STRENGTH * (1 + weightBonus * 0.22)
      const fx = (dx / distance) * force
      const fy = (dy / distance) * force

      source.vx += fx
      source.vy += fy
      target.vx -= fx
      target.vy -= fy
    }

    for (const position of positions) {
      position.vx += (centerX - position.x) * CENTER_STRENGTH
      position.vy += (centerY - position.y) * CENTER_STRENGTH
      position.vx *= VELOCITY_DECAY
      position.vy *= VELOCITY_DECAY
      position.x = clamp(
        position.x + position.vx,
        GRAPH_PADDING + position.radius,
        width - GRAPH_PADDING - position.radius,
      )
      position.y = clamp(
        position.y + position.vy,
        GRAPH_PADDING + position.radius,
        height - GRAPH_PADDING - position.radius,
      )
    }
  }

  return {
    width,
    height,
    centerX,
    centerY,
    nodes: graphNodes.map((node) => {
      const position = positionById.get(node.id)
      const nodeWidth = graphNodeWidth(node.title)

      return {
        id: node.id,
        title: node.title,
        kind: node.kind,
        degree: degreeMap.get(node.id) ?? 0,
        width: nodeWidth,
        height: NODE_HEIGHT,
        x: position?.x ?? centerX,
        y: position?.y ?? centerY,
      }
    }),
    edges,
  }
}
