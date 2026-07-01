import type { Session, User } from '@supabase/supabase-js'

import { getSupabase } from './supabase-client'

export const AUTH_EMAIL_REDIRECT_URL = 'https://kirylyaskou.github.io/PathMaid/auth-confirmed/'

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

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'user_already_exists'
  | 'invalid_email'
  | 'weak_password'
  | 'email_link_expired'
  | 'auth_callback_failed'
  | 'signup_disabled'
  | 'user_banned'
  | 'rate_limited'
  | 'network'
  | 'server'
  | 'not_configured'
  | 'unknown'

export interface TypedAuthError {
  /** Stable code for i18n lookup; 'unknown' = no specific mapping. */
  code: AuthErrorCode
  message: string
  providerCode?: string
  status?: number
  cause: unknown
}

function readAuthErrorField(err: unknown, field: string): unknown {
  return typeof err === 'object' && err !== null ? (err as Record<string, unknown>)[field] : undefined
}

function readAuthErrorStatus(err: unknown): number | undefined {
  const status = readAuthErrorField(err, 'status')
  return typeof status === 'number' ? status : undefined
}

function readAuthProviderCode(err: unknown): string | undefined {
  const code = readAuthErrorField(err, 'code')
  return typeof code === 'string' ? code : undefined
}

/** Map a raw Supabase auth error to a stable code the UI can translate. */
export function classifyAuthError(err: unknown): TypedAuthError {
  const msg = err instanceof Error ? err.message : String(err)
  const lower = msg.toLowerCase()
  const providerCode = readAuthProviderCode(err)
  const status = readAuthErrorStatus(err)

  const typed = (code: AuthErrorCode): TypedAuthError => ({
    code,
    message: msg,
    cause: err,
    ...(providerCode ? { providerCode } : {}),
    ...(status ? { status } : {}),
  })

  // Not-configured is thrown synchronously by getSupabase().
  if (/not configured/i.test(msg)) {
    return typed('not_configured')
  }
  if (providerCode === 'invalid_credentials' || lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return typed('invalid_credentials')
  }
  if (providerCode === 'email_not_confirmed' || lower.includes('email not confirmed') || lower.includes('not confirmed')) {
    return typed('email_not_confirmed')
  }
  if (
    providerCode === 'user_already_exists' ||
    providerCode === 'email_exists' ||
    providerCode === 'identity_already_exists' ||
    lower.includes('already registered') ||
    lower.includes('already been registered') ||
    lower.includes('user already exists')
  ) {
    return typed('user_already_exists')
  }
  if (providerCode === 'email_address_invalid' || lower.includes('invalid email')) {
    return typed('invalid_email')
  }
  if (providerCode === 'weak_password' || lower.includes('weak password') || lower.includes('password should be')) {
    return typed('weak_password')
  }
  if (
    providerCode === 'bad_code_verifier' ||
    providerCode === 'flow_state_expired' ||
    providerCode === 'flow_state_not_found' ||
    lower.includes('code verifier') ||
    lower.includes('auth code')
  ) {
    return typed('auth_callback_failed')
  }
  if (
    providerCode === 'otp_expired' ||
    lower.includes('email link is invalid or has expired') ||
    lower.includes('token has expired')
  ) {
    return typed('email_link_expired')
  }
  if (providerCode === 'signup_disabled' || lower.includes('signup disabled') || lower.includes('signups not allowed')) {
    return typed('signup_disabled')
  }
  if (providerCode === 'user_banned' || lower.includes('user is banned')) {
    return typed('user_banned')
  }
  if (
    providerCode === 'over_request_rate_limit' ||
    providerCode === 'over_email_send_rate_limit' ||
    providerCode === 'over_sms_send_rate_limit' ||
    lower.includes('rate limit') ||
    lower.includes('too many') ||
    lower.includes('for security purposes')
  ) {
    return typed('rate_limited')
  }
  if (providerCode === 'request_timeout' || lower.includes('failed to fetch') || lower.includes('network') || lower.includes('timeout')) {
    return typed('network')
  }
  if (providerCode === 'unexpected_failure' || (status !== undefined && status >= 500)) {
    return typed('server')
  }
  return typed('unknown')
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
