import { check, type Update, type DownloadEvent } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

// --- Types (public API — API-01, API-02) ---

export interface UpdateInfo {
  version: string
  currentVersion: string
  body: string
  date: string | null
}

export interface ProgressEvent {
  received: number
  total: number | null
}

// --- Errors (D-01: ES2020 native class extends Error; instanceof narrowing via prototype chain) ---

export class UpdaterError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = this.constructor.name
  }
}
export class UpdateNetworkError extends UpdaterError {}
export class UpdateSignatureError extends UpdaterError {}
export class UpdateInstallError extends UpdaterError {}

// --- Internal helpers ---

// Maps Tauri's Update (body?: string, date?: string) to our UpdateInfo (body: string, date: string | null).
// Required: API-01 pins body as non-nullable string and date as string | null.
function toUpdateInfo(u: Update): UpdateInfo {
  return {
    version: u.version,
    currentVersion: u.currentVersion,
    body: u.body ?? '',
    date: u.date ?? null,
  }
}

// D-11: case-insensitive substring match on error message. Tauri plugin errors come as strings
// from Rust side (SignatureError, "signature verification failed", "os error 18", etc.).
function classifyUpdateError(e: unknown): UpdaterError {
  const raw = e instanceof Error ? e.message : String(e)
  const msg = raw.toLowerCase()
  if (msg.includes('signature') || msg.includes('public key')) {
    return new UpdateSignatureError(raw, e)
  }
  if (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('http') ||
    msg.includes('timeout') ||
    msg.includes('dns')
  ) {
    return new UpdateNetworkError(raw, e)
  }
  if (
    msg.includes('install') ||
    msg.includes('rename') ||
    msg.includes('permission') ||
    msg.includes('cross-device') ||
    msg.includes('os error')
  ) {
    return new UpdateInstallError(raw, e)
  }
  return new UpdaterError(raw, e)
}

// --- Public API ---

/**
 * Check for an available update.
 *
 * - In dev (`!import.meta.env.PROD`): returns null without IPC call (D-07 dev-guard).
 * - In prod: calls plugin-updater's `check()`, maps Update → UpdateInfo.
 * - Network/signature failures are classified and THROWN (not swallowed to null).
 *   `null` is reserved for "no update available" semantics only.
 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!import.meta.env.PROD) return null
  try {
    const update = await check()
    if (!update) return null
    return toUpdateInfo(update)
  } catch (e) {
    throw classifyUpdateError(e)
  }
}

/**
 * Download and install the available update, emitting normalized progress events.
 *
 * - Re-calls `check()` internally to get a fresh Update resource (OQ-1: stateless, retry-safe).
 * - Normalizes Tauri's Started/Progress/Finished events into cumulative {received, total}.
 * - Throws UpdateInstallError if update is no longer available (race condition).
 * - On failure: classifies and throws typed error (NetworkError / SignatureError / InstallError).
 */
export async function downloadAndInstallUpdate(
  onProgress: (e: ProgressEvent) => void,
): Promise<void> {
  const update = await check()
  if (!update) throw new UpdateInstallError('Update no longer available')

  let received = 0
  let total: number | null = null

  try {
    await update.downloadAndInstall((e: DownloadEvent) => {
      if (e.event === 'Started') {
        total = e.data.contentLength ?? null
        received = 0
        onProgress({ received, total })
      } else if (e.event === 'Progress') {
        received += e.data.chunkLength
        onProgress({ received, total })
      }
      // 'Finished' intentionally ignored — install() triggers automatically, caller relies on promise resolution.
    })
  } catch (e) {
    throw classifyUpdateError(e)
  }
}

/**
 * Relaunch the application after update install.
 *
 * - On platforms where relaunch() fails (notably macOS — Tauri issue #11392):
 *   throws UpdateInstallError with localized message (D-09).
 * - macOS darwin-gate at UI layer (Phase 74 UI-04) prevents reaching this on darwin —
 *   this throw is a safety net.
 */
export async function relaunchApp(): Promise<void> {
  try {
    await relaunch()
  } catch (e) {
    throw new UpdateInstallError('Перезапустите приложение вручную', e)
  }
}
