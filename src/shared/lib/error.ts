import { toast } from 'sonner'

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
