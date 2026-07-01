-- Cloud sync progress + dirty-queue metadata.
--
-- sync_progress: per-table watermark. `last_pull_at` is the high-water mark of
-- remote updated_at we have already applied locally; the next pull asks the
-- server for rows newer than this. `last_push_at` is informational (debug).
-- One row per (table_name); user-scoping lives on the server via RLS, locally
-- the device holds exactly one user's data.
--
-- sync_errors: append-only log of failed sync operations so the UI can surface
-- "last sync failed: <reason>" and the user can retry. Not the queue itself —
-- the queue is the set of rows with sync_dirty=1 in each user table (0058).

CREATE TABLE IF NOT EXISTS sync_progress (
  table_name   TEXT PRIMARY KEY,
  last_pull_at TEXT,
  last_push_at TEXT,
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_errors (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT,
  direction  TEXT CHECK (direction IN ('push','pull')),
  message    TEXT NOT NULL,
  payload    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sync_errors_created
  ON sync_errors(created_at DESC);
