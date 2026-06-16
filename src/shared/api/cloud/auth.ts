import type { Session, User } from '@supabase/supabase-js'

import { getSupabase } from './supabase-client'

export const AUTH_EMAIL_REDIRECT_URL = 'pathmaid://auth/callback'

/**
 * Cloud auth wrappers.
 *
 * Every function surfaces a typed AuthError so the UI can map known cases
 * (invalid credentials, email not confirmed, rate limited, network) to
 * translated messages. Unknown errors fall through with the raw message.
 *
 * The Supabase client persists the session to localStorage itself (see
 * supabase-client.ts: persistSession: true), so getSession() is the source of
 * truth for "is the user logged in" — no separate token store needed.
 */

export interface AuthResult {
  user: User | null
  session: Session | null
}

export interface TypedAuthError {
  /** Stable code for i18n lookup; 'unknown' = no specific mapping. */
  code:
    | 'invalid_credentials'
    | 'email_not_confirmed'
    | 'user_already_exists'
    | 'rate_limited'
    | 'network'
    | 'not_configured'
    | 'unknown'
  message: string
  cause: unknown
}

/** Map a raw Supabase auth error to a stable code the UI can translate. */
export function classifyAuthError(err: unknown): TypedAuthError {
  const msg = err instanceof Error ? err.message : String(err)
  const lower = msg.toLowerCase()

  // Not-configured is thrown synchronously by getSupabase().
  if (/not configured/i.test(msg)) {
    return { code: 'not_configured', message: msg, cause: err }
  }
  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return { code: 'invalid_credentials', message: msg, cause: err }
  }
  if (lower.includes('email not confirmed') || lower.includes('not confirmed')) {
    return { code: 'email_not_confirmed', message: msg, cause: err }
  }
  if (lower.includes('already registered') || lower.includes('already been registered') || lower.includes('user already exists')) {
    return { code: 'user_already_exists', message: msg, cause: err }
  }
  if (lower.includes('rate limit') || lower.includes('too many') || lower.includes('for security purposes')) {
    return { code: 'rate_limited', message: msg, cause: err }
  }
  if (lower.includes('failed to fetch') || lower.includes('network') || lower.includes('timeout')) {
    return { code: 'network', message: msg, cause: err }
  }
  return { code: 'unknown', message: msg, cause: err }
}

function getAuthCallbackParams(urlString: string): URLSearchParams | null {
  let url: URL
  try {
    url = new URL(urlString)
  } catch {
    return null
  }

  const callbackPath = url.pathname.replace(/\/$/, '')
  if (url.protocol !== 'pathmaid:' || url.hostname !== 'auth' || callbackPath !== '/callback') {
    return null
  }

  const params = new URLSearchParams(url.search)
  const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash
  const hashParams = new URLSearchParams(hash)
  hashParams.forEach((value, key) => params.set(key, value))
  return params
}

/** Sign up with email + password. Requires email confirmation by default. */
export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<AuthResult> {
  const supabase = getSupabase()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: AUTH_EMAIL_REDIRECT_URL,
    },
  })
  if (error) throw classifyAuthError(error)
  return { user: data.user, session: data.session }
}

/** Complete a Supabase email confirmation callback opened via pathmaid://. */
export async function completeAuthCallback(url: string): Promise<AuthResult | null> {
  const params = getAuthCallbackParams(url)
  if (!params) return null

  const callbackError = params.get('error_description') ?? params.get('error')
  if (callbackError) {
    throw classifyAuthError(new Error(callbackError))
  }

  const supabase = getSupabase()
  const code = params.get('code')
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) throw classifyAuthError(error)
    return { user: data.user, session: data.session }
  }

  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  if (!accessToken || !refreshToken) return null

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })
  if (error) throw classifyAuthError(error)
  return { user: data.user, session: data.session }
}

/** Sign in with email + password. */
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthResult> {
  const supabase = getSupabase()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw classifyAuthError(error)
  return { user: data.user, session: data.session }
}

/** Sign out (clears the local session + server refresh token). */
export async function signOut(): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.auth.signOut()
  if (error) throw classifyAuthError(error)
}

/** Read the current session, if any. Does not throw on "no session". */
export async function getCurrentSession(): Promise<Session | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    // getSession failures are usually transient (storage corruption); surface
    // them but don't crash boot — the user can still use the app offline.
    console.warn('[cloud.auth] getSession failed:', error.message)
    return null
  }
  return data.session
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    console.warn('[cloud.auth] getUser failed:', error.message)
    return null
  }
  return data.user
}
