/**
 * Centralised access to build-time environment variables.
 *
 * Vite exposes any var prefixed with `VITE_` (see `envPrefix` in vite.config.ts)
 * via `import.meta.env`. This module validates presence at runtime so a missing
 * `.env` surfaces as a single explicit error rather than cryptic Supabase 404s.
 *
 * Cloud sync is optional: if the vars are absent, `isCloudConfigured` is false
 * and the Supabase client stays a lazy no-op (see `shared/api/cloud/supabase-client.ts`).
 * The app must remain fully functional without cloud — it is a local-first tool.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isCloudConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

/**
 * Throws if cloud is referenced but not configured. Call from cloud API entry
 * points so misconfiguration fails loudly and early with one clear message.
 */
export function requireCloudConfig(): {
  url: string
  anonKey: string
} {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      '[cloud] Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.',
    )
  }
  return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY }
}

export const cloudConfig = isCloudConfigured
  ? { url: SUPABASE_URL!, anonKey: SUPABASE_ANON_KEY! }
  : null
