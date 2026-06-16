import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { cloudConfig } from '@/shared/config/env'

/**
 * Singleton Supabase client.
 *
 * Lazily created on first access via `getSupabase()` so that importing this
 * module never throws — the app boots fully without cloud configured. Only
 * callers that actually need the backend call `getSupabase()` and must handle
 * the thrown error when cloud is off (see `requireCloudConfig`).
 *
 * Auth persistence: the JS SDK auto-persists the session to localStorage by
 * default. In a Tauri WebView localStorage is durable across launches, so this
 * restores the logged-in user without a re-login prompt on every start.
 */

let client: SupabaseClient | null = null

/**
 * Returns the shared Supabase client, creating it on first call.
 * Throws if cloud env vars are not set — check `isCloudConfigured` first or
 * handle the error to degrade gracefully.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client
  if (!cloudConfig) {
    throw new Error(
      '[cloud] Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    )
  }
  client = createClient(cloudConfig.url, cloudConfig.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // Tauri deep-link handling is explicit, not URL-based
    },
  })
  return client
}

/** True once the client has been instantiated (cloud configured + used). */
export function isSupabaseInitialised(): boolean {
  return client !== null
}

/** Reset the singleton. Tests / config-change reload only. */
export function resetSupabaseClient(): void {
  client = null
}
