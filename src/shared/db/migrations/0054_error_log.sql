-- Persistent error/warn/info log surfaced in the Debug page.
-- Mirror of tauri-plugin-log file output: the file survives crashes, this table
-- is the queryable source for date/level/actor filtering in the UI.
CREATE TABLE IF NOT EXISTS error_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL,
  actor TEXT NOT NULL,
  message TEXT NOT NULL,
  error_text TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_error_log_created_at ON error_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_log_level ON error_log(level);
