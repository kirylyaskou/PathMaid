import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import {
  getCurrentSession,
  getCurrentUser,
  completeAuthCallback,
  signInWithEmail,
  signOut as signOutApi,
  signUpWithEmail,
  type TypedAuthError,
} from '@/shared/api/cloud/auth'
import { getSupabase } from '@/shared/api/cloud/supabase-client'
import { isCloudConfigured } from '@/shared/config/env'

/**
 * Reactive view over the Supabase session.
 *
 * The session itself is persisted by supabase-js (localStorage, see
 * supabase-client.ts). This store mirrors it into Zustand so React can
 * subscribe to login/logout transitions without wiring onAuthStateChange
 * in every component.
 *
 * Lifecycle:
 *   - `hydrate()` is called once at boot (AppProviders) to load any existing
 *     session, then subscribes to supabase auth changes so token refresh and
 *     remote sign-out propagate here automatically.
 *   - signIn / signUp / signOut wrap the API and let the error bubble as a
 *     typed TypedAuthError so LoginDialog can translate it.
 */

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'error'

export interface AuthState {
  status: AuthStatus
  user: User | null
  session: Session | null
  /** Last auth error, cleared on next attempt. Null when no error. */
  error: TypedAuthError | null
  /** True once hydrate() has run — gates UI that must wait for session check. */
  initialised: boolean

  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  /** Complete a pathmaid:// auth callback. Returns false for unrelated URLs. */
  completeAuthCallback: (url: string) => Promise<boolean>
  /** Load existing session + subscribe to auth changes. Idempotent. */
  hydrate: () => Promise<void>
  clearError: () => void
}

let subscribed = false

export const useAuthStore = create<AuthState>()(
  immer((set, get) => ({
    status: 'idle',
    user: null,
    session: null,
    error: null,
    initialised: false,

    signIn: async (email, password) => {
      set((s) => { s.status = 'loading'; s.error = null })
      try {
        const { user, session } = await signInWithEmail(email, password)
        set((s) => {
          s.user = user
          s.session = session
          s.status = session ? 'authenticated' : 'idle'
        })
      } catch (err) {
        set((s) => { s.status = 'error'; s.error = err as TypedAuthError })
        throw err
      }
    },

    signUp: async (email, password) => {
      set((s) => { s.status = 'loading'; s.error = null })
      try {
        const { user, session } = await signUpWithEmail(email, password)
        set((s) => {
          s.user = user
          s.session = session
          // If email confirmation is required, session is null — user must
          // check inbox. The UI distinguishes this from an error.
          s.status = session ? 'authenticated' : 'idle'
        })
      } catch (err) {
        set((s) => { s.status = 'error'; s.error = err as TypedAuthError })
        throw err
      }
    },

    signOut: async () => {
      set((s) => { s.status = 'loading'; s.error = null })
      try {
        await signOutApi()
      } catch (err) {
        // Even if server sign-out fails (network), clear local session so the
        // UI reflects logged-out state. The stale refresh token is harmless.
        console.warn('[auth] signOut failed, clearing local session anyway:', err)
      }
      set((s) => {
        s.user = null
        s.session = null
        s.status = 'idle'
      })
    },

    completeAuthCallback: async (url) => {
      try {
        const result = await completeAuthCallback(url)
        if (!result) return false
        set((s) => {
          s.user = result.user
          s.session = result.session
          s.status = result.session ? 'authenticated' : 'idle'
          s.error = null
          s.initialised = true
        })
        return true
      } catch (err) {
        const authError = err as TypedAuthError
        set((s) => {
          s.status = 'error'
          s.error = authError
          s.initialised = true
        })
        throw err
      }
    },

    hydrate: async () => {
      if (get().initialised) return
      if (!isCloudConfigured) {
        set((s) => { s.initialised = true })
        return
      }
      try {
        const session = await getCurrentSession()
        const user = session ? await getCurrentUser() : null
        set((s) => {
          s.session = session
          s.user = user
          s.status = session ? 'authenticated' : 'idle'
          s.initialised = true
        })
      } catch (err) {
        console.warn('[auth] hydrate failed:', err)
        set((s) => { s.initialised = true })
      }

      // Subscribe once: supabase-js fires on token refresh, sign-in/out from
      // other tabs, and remote sign-out. Keep the store in sync without polling.
      if (!subscribed) {
        subscribed = true
        try {
          const supabase = getSupabase()
          supabase.auth.onAuthStateChange((event, session) => {
            // Avoid clobbering a deliberate 'loading' state during a local
            // sign-in attempt — only react to external events here.
            if (event === 'SIGNED_OUT') {
              set((s) => {
                s.session = null
                s.user = null
                s.status = 'idle'
              })
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              set((s) => {
                s.session = session
                s.user = session?.user ?? null
                if (s.status !== 'loading') {
                  s.status = session ? 'authenticated' : 'idle'
                }
              })
            }
          })
        } catch (err) {
          // getSupabase() may throw if config was removed between boot and now.
          console.warn('[auth] could not subscribe to auth changes:', err)
        }
      }
    },

    clearError: () => set((s) => { s.error = null }),
  })),
)
