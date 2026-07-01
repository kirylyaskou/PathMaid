import { SYNC_TABLES } from '@/shared/api/cloud/sync-tables'
import { pushTable } from '@/shared/api/cloud/sync-push'
import { pullTable } from '@/shared/api/cloud/sync-pull'
import { pushDeletions } from '@/shared/api/cloud/sync-deletions'
import { recordError, recordInfo } from '@/shared/api/logging'
import {
  pullMissingCampaignAssetFiles,
  pushCampaignAssetFiles,
} from '@/shared/api/cloud/asset-sync'
import { checkEmptyRemoteGuard } from '@/shared/api/cloud/sync-safety'

/**
 * Sync orchestrator.
 *
 * One pass = pull-all-then-push-all. Pull first so that when we push, any
 * server-side updates we missed are already merged locally and we don't
 * blindly overwrite them with a stale local row. (LWW on the server trigger
 * would protect us anyway, but pulling first reduces needless conflicts.)
 *
 * The engine is deliberately stateless — sync status (running/error/lastAt)
 * lives in the Zustand store (useSyncStore) which wraps these functions.
 * Keeping the engine pure lets it be called from a button, a timer, or a
 * background queue without coupling to React.
 */

export interface SyncRunResult {
  pulled: number
  applied: number
  skipped: number
  pushed: number
  deleted: number
  assetsUploaded: number
  assetsDownloaded: number
  errors: string[]
}

type SyncRunKind = 'full' | 'push-only' | 'pull-only'

function syncErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

async function appendSyncError(
  result: SyncRunResult,
  actor: string,
  message: string,
  err?: unknown,
): Promise<void> {
  result.errors.push(message)
  await recordError(actor, message, err)
}

async function appendSyncErrorMessages(
  result: SyncRunResult,
  actor: string,
  messages: string[],
): Promise<void> {
  for (const message of messages) {
    result.errors.push(message)
    await recordError(actor, message)
  }
}

function syncSummary(kind: SyncRunKind, result: SyncRunResult): string {
  return `${kind} sync finished: pulled=${result.pulled}, applied=${result.applied}, skipped=${result.skipped}, pushed=${result.pushed}, deleted=${result.deleted}, assetsUploaded=${result.assetsUploaded}, assetsDownloaded=${result.assetsDownloaded}, errors=${result.errors.length}`
}

async function guardPullFromEmptyRemote(
  kind: Extract<SyncRunKind, 'full' | 'pull-only'>,
  result: SyncRunResult,
): Promise<boolean> {
  try {
    const guard = await checkEmptyRemoteGuard()
    if (!guard.safe) {
      const message = guard.message ?? 'Cloud sync blocked by safety guard.'
      await appendSyncError(result, 'sync.guard.empty-remote', message)
      await recordInfo(`sync.${kind}`, syncSummary(kind, result))
      return false
    }
  } catch (err) {
    const msg = syncErrorMessage(err)
    await appendSyncError(result, 'sync.guard.empty-remote', `sync safety check failed: ${msg}`, err)
    await recordInfo(`sync.${kind}`, syncSummary(kind, result))
    return false
  }

  return true
}

/**
 * Run a full sync pass across all tables in registry order.
 * Pull → push. Throws only on a fatal config error (no cloud); per-table
 * errors are collected into `errors` and do not abort the pass.
 */
export async function runSync(): Promise<SyncRunResult> {
  await recordInfo('sync.full', 'full sync started')
  const result: SyncRunResult = {
    pulled: 0,
    applied: 0,
    skipped: 0,
    pushed: 0,
    deleted: 0,
    assetsUploaded: 0,
    assetsDownloaded: 0,
    errors: [],
  }

  if (!(await guardPullFromEmptyRemote('full', result))) {
    return result
  }

  // --- PULL ---
  for (const def of SYNC_TABLES) {
    try {
      const stats = await pullTable(def)
      result.pulled += stats.pulled
      result.applied += stats.applied
      result.skipped += stats.skipped
    } catch (err) {
      const msg = syncErrorMessage(err)
      await appendSyncError(result, `sync.pull.${def.local}`, `pull ${def.local}: ${msg}`, err)
      console.error(`[sync.engine] pull ${def.local} failed`, err)
    }
  }

  // Pull asset metadata first, then hydrate any missing local files from
  // Storage before the UI tries to render them on a fresh device.
  try {
    const assetStats = await pullMissingCampaignAssetFiles()
    result.assetsDownloaded += assetStats.downloaded
    await appendSyncErrorMessages(result, 'sync.pull.assets', assetStats.errors)
  } catch (err) {
    const msg = syncErrorMessage(err)
    await appendSyncError(result, 'sync.pull.assets', `pull asset files: ${msg}`, err)
    console.error('[sync.engine] pull asset files failed', err)
  }

  // --- PUSH (rows) ---
  for (const def of SYNC_TABLES) {
    try {
      if (def.local === 'campaign_assets') {
        const assetStats = await pushCampaignAssetFiles()
        result.assetsUploaded += assetStats.uploaded
        if (assetStats.errors.length > 0) {
          await appendSyncErrorMessages(result, 'sync.push.assets', assetStats.errors)
          continue
        }
      }
      const stats = await pushTable(def)
      result.pushed += stats.pushed
    } catch (err) {
      const msg = syncErrorMessage(err)
      await appendSyncError(result, `sync.push.${def.local}`, `push ${def.local}: ${msg}`, err)
      console.error(`[sync.engine] push ${def.local} failed`, err)
    }
  }

  // --- PUSH (deletions) ---
  // Tombstones are pushed AFTER rows so that a re-insert-then-delete sequence
  // on the same id does not leave the server with a phantom: the latest upsert
  // wins, then the delete removes it if the delete was the final local state.
  try {
    const delStats = await pushDeletions()
    result.deleted = delStats.reduce((sum, s) => sum + s.deleted, 0)
  } catch (err) {
    const msg = syncErrorMessage(err)
    await appendSyncError(result, 'sync.delete', `push deletions: ${msg}`, err)
    console.error('[sync.engine] push deletions failed', err)
  }

  await recordInfo('sync.full', syncSummary('full', result))
  return result
}

/**
 * Push only — used for an explicit "flush local changes" action without
 * pulling remote updates first (e.g. right after a bulk local edit).
 */
export async function runPushOnly(): Promise<SyncRunResult> {
  await recordInfo('sync.push-only', 'push-only sync started')
  const result: SyncRunResult = {
    pulled: 0,
    applied: 0,
    skipped: 0,
    pushed: 0,
    deleted: 0,
    assetsUploaded: 0,
    assetsDownloaded: 0,
    errors: [],
  }

  for (const def of SYNC_TABLES) {
    try {
      if (def.local === 'campaign_assets') {
        const assetStats = await pushCampaignAssetFiles()
        result.assetsUploaded += assetStats.uploaded
        if (assetStats.errors.length > 0) {
          await appendSyncErrorMessages(result, 'sync.push.assets', assetStats.errors)
          continue
        }
      }
      const stats = await pushTable(def)
      result.pushed += stats.pushed
    } catch (err) {
      const msg = syncErrorMessage(err)
      await appendSyncError(result, `sync.push.${def.local}`, `push ${def.local}: ${msg}`, err)
      console.error(`[sync.engine] push ${def.local} failed`, err)
    }
  }
  try {
    const delStats = await pushDeletions()
    result.deleted = delStats.reduce((sum, s) => sum + s.deleted, 0)
  } catch (err) {
    const msg = syncErrorMessage(err)
    await appendSyncError(result, 'sync.delete', `push deletions: ${msg}`, err)
    console.error('[sync.engine] push deletions failed', err)
  }
  await recordInfo('sync.push-only', syncSummary('push-only', result))
  return result
}

/**
 * Pull only — used for first-login "load from server" flow.
 */
export async function runPullOnly(): Promise<SyncRunResult> {
  await recordInfo('sync.pull-only', 'pull-only sync started')
  const result: SyncRunResult = {
    pulled: 0,
    applied: 0,
    skipped: 0,
    pushed: 0,
    deleted: 0,
    assetsUploaded: 0,
    assetsDownloaded: 0,
    errors: [],
  }
  if (!(await guardPullFromEmptyRemote('pull-only', result))) {
    return result
  }

  for (const def of SYNC_TABLES) {
    try {
      const stats = await pullTable(def)
      result.pulled += stats.pulled
      result.applied += stats.applied
      result.skipped += stats.skipped
    } catch (err) {
      const msg = syncErrorMessage(err)
      await appendSyncError(result, `sync.pull.${def.local}`, `pull ${def.local}: ${msg}`, err)
      console.error(`[sync.engine] pull ${def.local} failed`, err)
    }
  }

  try {
    const assetStats = await pullMissingCampaignAssetFiles()
    result.assetsDownloaded += assetStats.downloaded
    await appendSyncErrorMessages(result, 'sync.pull.assets', assetStats.errors)
  } catch (err) {
    const msg = syncErrorMessage(err)
    await appendSyncError(result, 'sync.pull.assets', `pull asset files: ${msg}`, err)
    console.error('[sync.engine] pull asset files failed', err)
  }

  await recordInfo('sync.pull-only', syncSummary('pull-only', result))
  return result
}
