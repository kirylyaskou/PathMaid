import { toast } from 'sonner'

export function errorMessage(err: unknown, fallback = 'Unknown error'): string {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'string' && err.trim()) return err
  if (err && typeof err === 'object') {
    const message = 'message' in err ? err.message : null
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
}

/** Return a catch handler that logs to console without crashing.
 *  Usage: `.catch(logError('load-items'))` */
export function logError(context: string) {
  return (err: unknown) => {
    console.error(`[${context}]`, err)
  }
}

/** Return a catch handler that logs + shows a toast error notification. */
export function logErrorWithToast(context: string) {
  return (err: unknown) => {
    console.error(`[${context}]`, err)
    toast.error(`Error: ${context}`)
  }
}
