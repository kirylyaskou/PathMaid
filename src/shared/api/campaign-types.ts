export type CampaignBucket = 'notes' | 'tables' | 'npcs' | 'items' | 'locations'

export type CampaignNodeKind =
  | 'bucket'
  | 'folder'
  | 'note'
  | 'table'
  | 'npc'
  | 'item'
  | 'location'

export type CampaignLinkSourceKind = 'markdown' | 'table-cell'

export interface Campaign {
  id: string
  name: string
  description: string
  accentColor: string
  coverAssetId: string | null
  lastOpenedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CampaignNode {
  id: string
  campaignId: string
  parentId: string | null
  kind: CampaignNodeKind
  bucket: CampaignBucket
  title: string
  sortOrder: number
  isSystem: boolean
  createdAt: string
  updatedAt: string
}

export interface CampaignDocument {
  nodeId: string
  markdown: string
  profileJson: string
  coverAssetId: string | null
  linkedDbRefsJson: string
  updatedAt: string
}

export interface CampaignTableColumn {
  id: string
  title: string
}

export interface CampaignTableRow {
  id: string
  title: string
}

export interface CampaignTableCells {
  [rowId: string]: Record<string, string>
}

export interface CampaignTableSizes {
  [id: string]: number
}

export interface CampaignTable {
  nodeId: string
  columns: CampaignTableColumn[]
  rows: CampaignTableRow[]
  cells: CampaignTableCells
  columnSizes: CampaignTableSizes
  rowSizes: CampaignTableSizes
  updatedAt: string
}

export interface CampaignLink {
  id: string
  campaignId: string
  sourceNodeId: string
  targetNodeId: string
  sourceKind: CampaignLinkSourceKind
  label: string
  createdFrom: string
  createdAt: string
}

export interface CampaignPin {
  campaignId: string
  nodeId: string
  sortOrder: number
  createdAt: string
}

export interface CampaignGraphPosition {
  campaignId: string
  nodeId: string
  x: number
  y: number
  updatedAt: string
}

export interface CampaignAsset {
  id: string
  campaignId: string
  kind: 'campaign-cover' | 'node-cover'
  fileName: string
  mimeType: string
  relativePath: string
  createdAt: string
}

export interface CampaignNodeArtwork {
  nodeId: string
  assetId: string
  sortOrder: number
  createdAt: string
}

export interface CampaignTreeNode extends CampaignNode {
  children: CampaignTreeNode[]
}
