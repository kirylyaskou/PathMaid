import type { CampaignNode, CampaignTreeNode } from '../model/types'

function compareCampaignNodes(left: CampaignNode, right: CampaignNode): number {
  const orderDelta = left.sortOrder - right.sortOrder

  if (orderDelta !== 0) {
    return orderDelta
  }

  return left.title.localeCompare(right.title)
}

function sortCampaignTree(nodes: CampaignTreeNode[]): CampaignTreeNode[] {
  return nodes
    .sort(compareCampaignNodes)
    .map((node) => ({
      ...node,
      children: sortCampaignTree(node.children),
    }))
}

export function buildCampaignTree(nodes: CampaignNode[]): CampaignTreeNode[] {
  const nodeMap = new Map<string, CampaignTreeNode>()

  for (const node of nodes) {
    nodeMap.set(node.id, { ...node, children: [] })
  }

  const roots: CampaignTreeNode[] = []

  for (const node of nodeMap.values()) {
    if (node.parentId === null) {
      roots.push(node)
      continue
    }

    const parent = nodeMap.get(node.parentId)

    if (parent) {
      parent.children.push(node)
    }
  }

  return sortCampaignTree(roots)
}

export function isOpenableCampaignNode(node: CampaignNode): boolean {
  return node.kind !== 'bucket' && node.kind !== 'folder'
}

export function findNodeById(
  nodes: CampaignNode[] | null | undefined,
  id: string | null | undefined,
): CampaignNode | null {
  if (!nodes || !id) {
    return null
  }

  return nodes.find((node) => node.id === id) ?? null
}

export function campaignNodeDescendantIds(nodes: CampaignNode[], nodeId: string): Set<string> {
  const descendantIds = new Set<string>()
  const pendingIds = [nodeId]

  while (pendingIds.length > 0) {
    const currentId = pendingIds.pop()
    if (!currentId || descendantIds.has(currentId)) {
      continue
    }

    descendantIds.add(currentId)
    for (const node of nodes) {
      if (node.parentId === currentId) {
        pendingIds.push(node.id)
      }
    }
  }

  return descendantIds
}

export function nodesByTitle(nodes: CampaignNode[]): Map<string, CampaignNode> {
  const titleMap = new Map<string, CampaignNode>()

  for (const node of nodes) {
    if (isOpenableCampaignNode(node)) {
      titleMap.set(node.title.toLowerCase(), node)
    }
  }

  return titleMap
}
