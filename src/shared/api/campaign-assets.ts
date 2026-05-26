import { invoke } from '@tauri-apps/api/core'

interface SaveCampaignAssetBytesInput {
  campaignId: string
  assetId: string
  extension: string
  bytes: Uint8Array
}

export async function saveCampaignAssetBytes(
  params: SaveCampaignAssetBytesInput,
): Promise<string> {
  return invoke<string>('save_campaign_asset_bytes', {
    campaignId: params.campaignId,
    assetId: params.assetId,
    extension: params.extension,
    bytes: Array.from(params.bytes),
  })
}

export async function removeCampaignAsset(relativePath: string): Promise<void> {
  await invoke('remove_campaign_asset', { relativePath })
}

export async function readCampaignAssetBytes(relativePath: string): Promise<Uint8Array> {
  const bytes = await invoke<number[]>('read_campaign_asset_bytes', { relativePath })
  return new Uint8Array(bytes)
}

export function assetBytesToObjectUrl(bytes: Uint8Array, mimeType: string): string {
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }))
}
