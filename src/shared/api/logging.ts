import { error as pluginError, warn as pluginWarn, info as pluginInfo } from '@tauri-apps/plugin-log'
import { getDb } from '@/shared/db'

// --- Types (public API) ---

export type LogLevel = 'error' | 'warn' | 'info'

export interface ErrorLogRow {
  id: number
  level: LogLevel
  actor: string
  message: string
  error_text: string | null
  created_at: string
}

export interface ErrorLogFilter {
  from?: string // ISO date (inclusive), lower bound on created_at
  to?: string // ISO date (inclusive), upper bound on created_at
  level?: LogLevel // exact level match
  actor?: string // substring match (case-insensitive)
  limit?: number // default 500
}

// --- Internal helpers ---

// Stack trace is noisy and unbounded — cap it so one error can't bloat a row.
const MAX_ERROR_TEXT = 2000

/**
 * Best-effort single-line message extracted from an unknown caught value.
 * Use to embed error context in a {@link logWarn}/{@link logInfo} message
 * (the error-level {@link logError} already serialises `err` into error_text).
 */
export function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

function describeError(err: unknown): string {
  if (err instanceof Error) {
    const stack = err.stack ? `\n${err.stack}` : ''
    return `${err.name}: ${err.message}${stack}`.slice(0, MAX_ERROR_TEXT)
  }
  return errMessage(err).slice(0, MAX_ERROR_TEXT)
}

// SQLite mirror. Awaited so the Debug page sees a consistent row right after
// the call returns; the Rust file write below is fire-and-forget (crash-safe
// audit trail, best-effort — if the IPC round-trip fails we still have SQLite).
async function insertLog(
  level: LogLevel,
  actor: string,
  message: string,
  errorText: string | null,
): Promise<void> {
  const createdAt = new Date().toISOString()
  try {
    const db = await getDb()
    await db.execute(
      'INSERT INTO error_log (level, actor, message, error_text, created_at) VALUES (?, ?, ?, ?, ?)',
      [level, actor, message, errorText, createdAt],
    )
  } catch {
    // Logging must never throw back to the caller — the original error context
    // is more important than persisting this row. The Rust file target is the
    // durable fallback.
  }
}

// Body shape passed to the Rust formatter:
//   ACTOR|MESSAGE   or   ACTOR|MESSAGE|ERROR
// The Rust side stamps LEVEL + TIMESTAMP, producing the canonical
// LEVEL-ACTOR-TIMESTAMP-MESSAGE-ERROR line.
function buildRustBody(actor: string, message: string, errorText?: string): string {
  const base = `${actor}|${message}`
  return errorText ? `${base}|${errorText.replace(/\s+/g, ' ').slice(0, MAX_ERROR_TEXT)}` : base
}

// --- Public API ---

/**
 * Record an error-level event.
 *
 * Writes to BOTH the durable Rust file target (tauri-plugin-log) and the
 * queryable SQLite `error_log` table. Never throws — safe to call from catch
 * blocks without a nested try/catch.
 *
 * Named `recordError` (not `logError`) to avoid colliding with the curried
 * `.catch(logError('ctx'))` helper in shared/lib/error.ts.
 *
 * @param actor stable source identifier (e.g. 'SettingsPage.sync')
 * @param message human-readable description
 * @param err optional caught value; serialised to name+message+stack
 */
export async function recordError(actor: string, message: string, err?: unknown): Promise<void> {
  const errorText = err !== undefined ? describeError(err) : null
  const body = buildRustBody(actor, message, errorText ?? undefined)
  void pluginError(body).catch(() => {})
  await insertLog('error', actor, message, errorText)
}

/**
 * Record a warn-level event. See {@link recordError} for dual-write semantics.
 */
export async function recordWarn(actor: string, message: string): Promise<void> {
  const body = buildRustBody(actor, message)
  void pluginWarn(body).catch(() => {})
  await insertLog('warn', actor, message, null)
}

/**
 * Record an info-level event. See {@link recordError} for dual-write semantics.
 */
export async function recordInfo(actor: string, message: string): Promise<void> {
  const body = buildRustBody(actor, message)
  void pluginInfo(body).catch(() => {})
  await insertLog('info', actor, message, null)
}

/**
 * Query the SQLite log mirror with optional date/level/actor filters.
 * Results are newest-first.
 */
export async function listErrorLogs(filter: ErrorLogFilter = {}): Promise<ErrorLogRow[]> {
  const db = await getDb()
  const where: string[] = []
  const params: (string | number)[] = []
  if (filter.from) {
    where.push('created_at >= ?')
    params.push(filter.from)
  }
  if (filter.to) {
    where.push('created_at <= ?')
    params.push(filter.to)
  }
  if (filter.level) {
    where.push('level = ?')
    params.push(filter.level)
  }
  if (filter.actor) {
    where.push('LOWER(actor) LIKE ?')
    params.push(`%${filter.actor.toLowerCase()}%`)
  }
  const limit = filter.limit ?? 500
  params.push(limit)
  const sql = `SELECT id, level, actor, message, error_text, created_at
               FROM error_log
               ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
               ORDER BY created_at DESC
               LIMIT ?`
  return db.select<ErrorLogRow[]>(sql, params)
}

/**
 * Remove every row from the SQLite log mirror. Called by the Debug page
 * "Clear" action. The Rust file target keeps its full history on disk.
 */
export async function clearErrorLogs(): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM error_log', [])
}
