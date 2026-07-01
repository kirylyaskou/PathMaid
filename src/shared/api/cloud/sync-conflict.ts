/**
 * Last-write-wins (LWW) conflict resolution for cloud sync.
 *
 * Pure functions — no I/O, no side effects — so the merge logic is unit-testable
 * in isolation. The sync engine calls `shouldApplyRemote` for each pulled row
 * to decide whether to overwrite the local copy.
 *
 * Timestamps are ISO-8601 strings (UTC, 'Z' suffix). Lexicographic comparison
 * of well-formed ISO strings is equivalent to chronological comparison, so a
 * plain `<` / `>` works without Date parsing (which is locale-sensitive).
 *
 * Equality is a KEEP-LOCAL decision: when local and remote updated_at match
 * exactly (same millisecond, e.g. a round-trip of a just-pushed row), there is
 * nothing to apply. This prevents a redundant write after every push.
 */

/**
 * Decide whether a remote row should overwrite the local row.
 *
 * Returns true when:
 *   - the remote row is strictly newer than local, OR
 *   - the local row does not exist (localUpdatedAt is null).
 * Returns false when:
 *   - the local row is newer or equal (keep local — it will be pushed next).
 */
export function shouldApplyRemote(
  localUpdatedAt: string | null,
  remoteUpdatedAt: string,
): boolean {
  if (localUpdatedAt == null) return true
  // Strictly greater — equal timestamps mean "already in sync".
  return remoteUpdatedAt > localUpdatedAt
}

/**
 * Normalise a timestamp to a comparable ISO string.
 *
 * Local SQLite stores updated_at as `datetime('now')` → 'YYYY-MM-DD HH:MM:SS'
 * (space separator, no tz). Remote Postgres returns TIMESTAMPTZ as an ISO
 * string with 'T' and 'Z'. To compare them lexicographically we coerce both
 * to the same shape: 'YYYY-MM-DDTHH:MM:SS' with fractional seconds trimmed.
 *
 * This is intentionally lossy at sub-second precision — sync granularity is
 * seconds, which is fine for a GM tool (a user does not edit the same row on
 * two devices within the same second).
 */
export function normaliseTimestamp(ts: string | null | undefined): string | null {
  if (!ts) return null
  // Replace space separator with 'T' so SQLite and Postgres formats agree.
  let s = ts.replace(' ', 'T')
  // Drop sub-second fraction and trailing timezone so comparison is by second.
  // Keep only the first 19 chars: YYYY-MM-DDTHH:MM:SS.
  if (s.length >= 19) s = s.slice(0, 19)
  return s
}
