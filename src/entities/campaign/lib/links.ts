import type { CampaignLinkSourceKind, CampaignNode, CampaignTableCells } from '../model/types'
import { nodesByTitle } from './tree'

export interface ExtractedCampaignLink {
  targetNodeId: string
  sourceKind: CampaignLinkSourceKind
  label: string
  createdFrom: string
}

export const WIKI_LINK_PATTERN = /\[\[([^\]\n]+)\]\](?:\(([^\)\n]+)\))?/g

interface ParsedWikiLink {
  targetTitle: string
  label: string
  raw: string
}

function parseWikiLinks(text: string): ParsedWikiLink[] {
  const pattern = new RegExp(WIKI_LINK_PATTERN.source, WIKI_LINK_PATTERN.flags)

  return [...text.matchAll(pattern)]
    .map((match) => {
      const rawContent = match[1] ?? ''
      const aliasLabel = match[2]
      const [targetTitle, pipeLabel] = rawContent.split('|')
      const normalizedTitle = targetTitle.trim()
      const normalizedLabel = (aliasLabel ?? pipeLabel ?? targetTitle).trim()

      return {
        targetTitle: normalizedTitle,
        label: normalizedLabel,
        raw: match[0],
      }
    })
    .filter((link) => link.targetTitle.length > 0)
}

function extractWikiLinks(
  text: string,
  nodes: CampaignNode[],
  sourceKind: CampaignLinkSourceKind,
  createCreatedFrom: (raw: string) => string,
): ExtractedCampaignLink[] {
  const titleMap = nodesByTitle(nodes)

  return parseWikiLinks(text)
    .map((link) => {
      const targetNode = titleMap.get(link.targetTitle.toLowerCase())

      if (!targetNode) {
        return null
      }

      return {
        targetNodeId: targetNode.id,
        sourceKind,
        label: link.label,
        createdFrom: createCreatedFrom(link.raw),
      }
    })
    .filter((link): link is ExtractedCampaignLink => link !== null)
}

export function formatCampaignWikiLink(title: string): string {
  return `[[${title.trim()}]]`
}

export function extractMarkdownLinks(
  markdown: string,
  nodes: CampaignNode[],
): ExtractedCampaignLink[] {
  return extractWikiLinks(markdown, nodes, 'markdown', (raw) => raw)
}

export function extractTableLinks(
  cells: CampaignTableCells,
  nodes: CampaignNode[],
): ExtractedCampaignLink[] {
  const links: ExtractedCampaignLink[] = []

  for (const [rowId, row] of Object.entries(cells)) {
    for (const [columnId, raw] of Object.entries(row)) {
      links.push(
        ...extractWikiLinks(raw, nodes, 'table-cell', (linkRaw) => `${rowId}:${columnId}:${linkRaw}`),
      )
    }
  }

  return links
}
