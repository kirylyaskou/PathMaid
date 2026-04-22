import { platform, type Platform } from '@tauri-apps/plugin-os'
import { openUrl } from '@tauri-apps/plugin-opener'

/**
 * Canonical PathMaid GitHub releases page.
 *
 * Used by:
 * - UI-04 macOS Settings button ("Открыть страницу релиза")
 * - Linux cross-device error fallback button
 *
 * Hardcoded const — no user input reaches openUrl (XSS/injection guard).
 */
export const RELEASES_LATEST_URL = 'https://github.com/kirylyaskou/PathMaid/releases/latest' as const

/**
 * Returns the current OS platform literal.
 *
 * SYNCHRONOUS — the value is cached into `window.__TAURI_OS_PLUGIN_INTERNALS__.platform`
 * by Tauri bootstrap before React mounts. No Promise/await needed.
 * Source: tauri-apps/plugins-workspace/blob/v2/plugins/os/guest-js/index.ts
 */
export function getPlatform(): Platform {
  return platform()
}

/**
 * True on macOS. Drives the darwin-gate across UI :
 * - Settings: button swapped to "Открыть страницу релиза"
 * - UpdateDialog: component returns null
 * - Phase 75 hook: auto-check skipped
 *
 * Platform literal from plugin-os is 'macos' (Rust-style), NOT 'darwin' (Node-style).
 */
export function isDarwin(): boolean {
  return platform() === 'macos'
}

/**
 * Opens the PathMaid releases page in the user's default browser.
 *
 * Uses @tauri-apps/plugin-opener — Tauri WebView blocks/proxies native
 * window.open() in release builds. Plugin-opener goes through native OS API.
 *
 * Requires capability `opener:default` (already granted in Phase 1).
 */
export async function openReleasesPage(): Promise<void> {
  await openUrl(RELEASES_LATEST_URL)
}
