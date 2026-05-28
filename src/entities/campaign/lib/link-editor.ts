import type { CampaignBucket, CampaignLink, CampaignNode, CampaignNodeKind } from '../model/types'
import { isOpenableCampaignNode } from './tree'

export type LinkableCampaignNodeKind = Extract<
  CampaignNodeKind,
  'note' | 'npc' | 'item' | 'location'
>

interface LinkGuess {
  node: CampaignNode
  score: number
}

export function linkTitleFromSelection(text: string): string {
  const trimmed = text.trim()
  const wikiMatch = trimmed.match(/^\[\[([^\]\n]+)\]\](?:\([^\)\n]+\))?$/)
  const rawTitle = wikiMatch?.[1] ?? trimmed
  return (rawTitle.split('|')[0] ?? rawTitle).trim()
}

export function bucketForLinkedKind(
  kind: LinkableCampaignNodeKind,
  node: CampaignNode,
): CampaignBucket {
  if (kind === 'note') {
    return 'notes'
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

  return node.bucket
}

export function topLevelBucketNode(
  nodes: CampaignNode[],
  campaignId: string,
  bucket: CampaignBucket,
): CampaignNode | null {
  return (
    nodes.find(
      (candidate) =>
        candidate.campaignId === campaignId &&
        candidate.kind === 'bucket' &&
        candidate.bucket === bucket &&
        candidate.parentId === null,
    ) ?? null
  )
}

function normalizeLinkGuessText(value: string): string {
  return linkTitleFromSelection(value).toLowerCase()
}

function graphNeighborIds(nodeId: string, links: CampaignLink[]): Set<string> {
  const neighbors = new Set<string>()

  for (const link of links) {
    if (link.sourceNodeId === nodeId) {
      neighbors.add(link.targetNodeId)
    } else if (link.targetNodeId === nodeId) {
      neighbors.add(link.sourceNodeId)
    }
  }

  return neighbors
}

export function campaignLinkGuesses(
  sourceNode: CampaignNode,
  nodes: CampaignNode[],
  links: CampaignLink[],
  draft: string,
): CampaignNode[] {
  const query = normalizeLinkGuessText(draft)
  const neighborIds = graphNeighborIds(sourceNode.id, links)

  return nodes
    .filter(
      (candidate) =>
        candidate.id !== sourceNode.id &&
        candidate.campaignId === sourceNode.campaignId &&
        isOpenableCampaignNode(candidate),
    )
    .map((candidate): LinkGuess => {
      const title = candidate.title.toLowerCase()
      let score = 0
      let textScore = 0

      if (query.length > 0) {
        if (title === query) textScore = 120
        else if (title.startsWith(query)) textScore = 90
        else if (title.includes(query)) textScore = 65
      }

      score += textScore
      if (neighborIds.has(candidate.id)) score += 45
      if (candidate.bucket === sourceNode.bucket) score += 10
      if (candidate.kind === sourceNode.kind) score += 4

      return { node: candidate, score: query.length === 0 || textScore > 0 ? score : 0 }
    })
    .filter((guess) => guess.score > 0)
    .sort((left, right) => right.score - left.score || left.node.title.localeCompare(right.node.title))
    .slice(0, 6)
    .map((guess) => guess.node)
}
