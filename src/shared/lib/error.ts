import { toast } from 'sonner'
import { recordError } from '@/shared/api'

export function errorMessage(err: unknown, fallback = 'Unknown error'): string {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'string' && err.trim()) return err
  if (err && typeof err === 'object') {
    const message = 'message' in err ? err.message : null
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
}

/**
 * Curried catch handler: records the error to the persistent log
 * (SQLite mirror + Rust file target via @/shared/api) and swallows it.
 *
 * Usage: `.catch(logError('load-items'))`
 *
 * The error is intentionally NOT rethrown — these handlers guard async chains
 * whose rejection would otherwise bubble into an unhandled promise warning.
 */
export function logError(context: string) {
  return (err: unknown) => {
    void recordError(context, errorMessage(err), err)
  }
}

/**
 * Curried catch handler: records the error (see {@link logError}) AND surfaces
 * a user-visible toast. Use for user-initiated actions whose failure the user
 * must learn about (deploy, export, drag-insert, etc).
 */
export function logErrorWithToast(context: string) {
  return (err: unknown) => {
    void recordError(context, errorMessage(err), err)
    toast.error(`Error: ${context}`)
  }
}
