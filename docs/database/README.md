# Database Reference

PathMaid uses SQLite. The database is local to the app — no server required.

## Contents

- [Schema](schema.md) — all tables and columns with descriptions
- [ERD](erd.md) — entity relationship diagram
- [Migrations](migrations.md) — migration list and how the system works
- [Example Queries](queries.md) — useful SQL for inspecting the database

## Database Location

| OS | Path |
|---|---|
| Windows | `%APPDATA%\com.pathmaid.app\pathmaid.db` |
| macOS | `~/Library/Application Support/com.pathmaid.app/pathmaid.db` |
| Linux | `~/.local/share/com.pathmaid.app/pathmaid.db` |

## Opening the Database

Use any SQLite client. Recommended: [DB Browser for SQLite](https://sqlitebrowser.org/) (free, cross-platform).

The database uses WAL mode (`journal_mode=WAL`) — you may see a `pathmaid.db-wal` and `pathmaid.db-shm` file alongside the main database. These are normal and part of the write-ahead log. Do not delete them while the app is running.

## Data Sources

| Table(s) | Source |
|---|---|
| `entities`, `spells`, `items`, `hazards`, `actions` | Foundry VTT data sync (Settings → Sync) |
| `characters` | Pathbuilder 2e JSON export (Characters page) |
| `custom_creatures` | PathMaid creature builder |
| `translations` | Bundled RU translations (pf2.ru) — seeded on startup |
| `encounters`, `combat_*` | Created and managed inside PathMaid |
