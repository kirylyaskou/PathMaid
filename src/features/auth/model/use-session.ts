import { useShallow } from 'zustand/react/shallow'

import { useAuthStore } from './auth-store'

/**
 * Convenience selector for components that only care about auth state + user.
 * useShallow is mandatory for object selectors (per AGENTS.md React conventions)
 * so the consumer doesn't re-render on unrelated store writes.
 */
export function useSession() {
  return useAuthStore(
    useShallow((s) => ({
      status: s.status,
      user: s.user,
      initialised: s.initialised,
      isAuthenticated: s.status === 'authenticated' && s.user != null,
    })),
  )
}
