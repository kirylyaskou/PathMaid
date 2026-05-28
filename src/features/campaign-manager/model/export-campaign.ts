import {
  getCampaignDocument,
  getCampaignTable,
  listCampaignAssets,
  listCampaignGraphPositions,
  listCampaignLinks,
  listCampaignNodeArtworks,
  listCampaignNodes,
  listCampaignPins,
  readCampaignAssetBytes,
  type Campaign,
  type CampaignAsset,
  type CampaignDocument,
  type CampaignGraphPosition,
  type CampaignLink,
  type CampaignNode,
  type CampaignNodeArtwork,
  type CampaignPin,
  type CampaignTable,
} from '@/shared/api'

interface ExportedCampaignAsset {
  asset: CampaignAsset
  bytesBase64: string
}

interface ExportedCampaignFile {
  format: 'pathmaid.campaign.export'
  version: 1
  exportedAt: string
  campaign: Campaign
  nodes: CampaignNode[]
  documents: CampaignDocument[]
  tables: CampaignTable[]
  links: CampaignLink[]
  pins: CampaignPin[]
  graphPositions: CampaignGraphPosition[]
  nodeArtworks: CampaignNodeArtwork[]
  assets: ExportedCampaignAsset[]
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000
  let binary = ''

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

function campaignExportFileName(name: string): string {
  const safeName = name
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/\.+$/g, '')

  return `${safeName || 'campaign'}.pathmaid`
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export async function exportCampaignToPathmaidFile(campaign: Campaign): Promise<void> {
  const [nodes, links, pins, graphPositions, nodeArtworks, assets] = await Promise.all([
    listCampaignNodes(campaign.id),
    listCampaignLinks(campaign.id),
    listCampaignPins(campaign.id),
    listCampaignGraphPositions(campaign.id),
    listCampaignNodeArtworks(campaign.id),
    listCampaignAssets(campaign.id),
  ])

  const openableNodes = nodes.filter((node) => node.kind !== 'bucket' && node.kind !== 'folder')
  const [documents, tables, exportedAssets] = await Promise.all([
    Promise.all(
      openableNodes
        .filter((node) => node.kind !== 'table')
        .map((node) => getCampaignDocument(node.id)),
    ),
    Promise.all(
      openableNodes
        .filter((node) => node.kind === 'table')
        .map((node) => getCampaignTable(node.id)),
    ),
    Promise.all(
      assets.map(async (asset) => ({
        asset,
        bytesBase64: bytesToBase64(await readCampaignAssetBytes(asset.relativePath)),
      })),
    ),
  ])

  const exported: ExportedCampaignFile = {
    format: 'pathmaid.campaign.export',
    version: 1,
    exportedAt: new Date().toISOString(),
    campaign,
    nodes,
    documents: documents.filter((document): document is CampaignDocument => document !== null),
    tables: tables.filter((table): table is CampaignTable => table !== null),
    links,
    pins,
    graphPositions,
    nodeArtworks,
    assets: exportedAssets,
  }

  downloadBlob(
    new Blob([JSON.stringify(exported)], { type: 'application/vnd.pathmaid.campaign+json' }),
    campaignExportFileName(campaign.name),
  )
}
