import { readCampaignAssetBytes, saveCampaignAssetBytes } from '@/shared/api/campaign-assets'
import { getDb } from '@/shared/db'

import { getSupabase } from './supabase-client'
import {
  assetExtensionFromRelativePath,
  campaignAssetFolderPath,
  campaignAssetObjectName,
  campaignAssetObjectPath,
} from './asset-paths'

const BUCKET = 'campaign-assets'

interface CampaignAssetFileRow {
  id: string
  campaign_id: string
  file_name: string
  mime_type: string | null
  relative_path: string
  sync_dirty: number
}

export interface AssetFileSyncStats {
  uploaded: number
  downloaded: number
  deleted: number
  errors: string[]
}

function emptyStats(): AssetFileSyncStats {
  return { uploaded: 0, downloaded: 0, deleted: 0, errors: [] }
}

async function getAuthenticatedUserId(): Promise<string> {
  const supabase = getSupabase()
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('No authenticated user for asset sync')
  return data.user.id
}

async function listLocalAssets(): Promise<CampaignAssetFileRow[]> {
  const db = await getDb()
  return db.select<CampaignAssetFileRow[]>(
    `SELECT id, campaign_id, file_name, mime_type, relative_path, sync_dirty
       FROM campaign_assets
      WHERE deleted_at IS NULL`,
    [],
  )
}

async function storageObjectExists(
  userId: string,
  assetId: string,
  fileName: string,
): Promise<boolean> {
  const supabase = getSupabase()
  const folder = campaignAssetFolderPath(userId, assetId)
  const objectName = campaignAssetObjectName(fileName)
  const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
    limit: 100,
  })
  if (error) throw error
  return (data ?? []).some((item) => item.name === objectName)
}

export async function pushCampaignAssetFiles(): Promise<AssetFileSyncStats> {
  const stats = emptyStats()
  const userId = await getAuthenticatedUserId()
  const assets = await listLocalAssets()
  const bucket = getSupabase().storage.from(BUCKET)

  for (const asset of assets) {
    let bytes: Uint8Array
    try {
      bytes = await readCampaignAssetBytes(asset.relative_path)
    } catch {
      if (asset.sync_dirty === 1) {
        stats.errors.push(`asset upload ${asset.id}: local file is missing`)
      }
      continue
    }

    try {
      if (
        asset.sync_dirty !== 1 &&
        await storageObjectExists(userId, asset.id, asset.file_name)
      ) {
        continue
      }
      const objectPath = campaignAssetObjectPath(userId, asset.id, asset.file_name)
      const { error } = await bucket.upload(
        objectPath,
        new Blob([bytes], { type: asset.mime_type ?? 'application/octet-stream' }),
        {
          contentType: asset.mime_type ?? 'application/octet-stream',
          upsert: true,
        },
      )
      if (error) {
        stats.errors.push(`asset upload ${asset.id}: ${error.message}`)
        continue
      }
      stats.uploaded++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      stats.errors.push(`asset upload ${asset.id}: ${msg}`)
    }
  }

  return stats
}

export async function pullMissingCampaignAssetFiles(): Promise<AssetFileSyncStats> {
  const stats = emptyStats()
  const userId = await getAuthenticatedUserId()
  const assets = await listLocalAssets()
  const bucket = getSupabase().storage.from(BUCKET)

  for (const asset of assets) {
    try {
      await readCampaignAssetBytes(asset.relative_path)
      continue
    } catch {
      // Missing locally: fall through to Storage download.
    }

    try {
      const objectPath = campaignAssetObjectPath(userId, asset.id, asset.file_name)
      const { data, error } = await bucket.download(objectPath)
      if (error) {
        stats.errors.push(`asset download ${asset.id}: ${error.message}`)
        continue
      }
      const bytes = new Uint8Array(await data.arrayBuffer())
      const savedPath = await saveCampaignAssetBytes({
        campaignId: asset.campaign_id,
        assetId: asset.id,
        extension: assetExtensionFromRelativePath(asset.relative_path),
        bytes,
      })
      if (savedPath !== asset.relative_path) {
        stats.errors.push(`asset download ${asset.id}: saved path mismatch`)
        continue
      }
      stats.downloaded++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      stats.errors.push(`asset download ${asset.id}: ${msg}`)
    }
  }

  return stats
}

export async function removeCampaignAssetObjects(assetIds: string[]): Promise<AssetFileSyncStats> {
  const stats = emptyStats()
  if (assetIds.length === 0) return stats

  const userId = await getAuthenticatedUserId()
  const bucket = getSupabase().storage.from(BUCKET)

  for (const assetId of assetIds) {
    try {
      const folder = campaignAssetFolderPath(userId, assetId)
      const { data, error: listError } = await bucket.list(folder, { limit: 100 })
      if (listError) {
        stats.errors.push(`asset delete ${assetId}: ${listError.message}`)
        continue
      }
      const paths = (data ?? []).map((item) => `${folder}/${item.name}`)
      if (paths.length === 0) continue

      const { error } = await bucket.remove(paths)
      if (error) {
        stats.errors.push(`asset delete ${assetId}: ${error.message}`)
        continue
      }
      stats.deleted += paths.length
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      stats.errors.push(`asset delete ${assetId}: ${msg}`)
    }
  }

  return stats
}
