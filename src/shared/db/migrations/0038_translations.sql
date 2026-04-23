-- Phase 78: Localization content store for pf2.ru-sourced translations.
--
-- Single polymorphic table for all kinds (monster/spell/item/feat/action) to
-- avoid 5 parallel schemas. Matching key is canonical English `name` with
-- NOCASE collation + optional level for disambiguation (two creatures can
-- share a name across levels — e.g. young/adult dragon variants).
--
-- Fields:
--   kind      — 'monster' | 'spell' | 'item' | 'feat' | 'action'
--   name_key  — English name as it appears in source tables (entities.name,
--               spells.name, items.name, actions.name)
--   level     — optional disambiguator; NULL for actions and any kind where
--               the source record has no level
--   locale    — BCP-47 base code ('ru' today; extensible to 'de', 'fr', ...)
--   name_loc  — translated display name
--   traits_loc — comma-separated translated trait labels (optional)
--   text_loc  — raw HTML of the translated stat block; sanitized at render
--               time by <SafeHtml/> (Phase 79)
--   source    — provenance tag ('pf2.ru'); lets us later filter / re-import
--               per source

CREATE TABLE IF NOT EXISTS translations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  kind       TEXT    NOT NULL,
  name_key   TEXT    NOT NULL,
  level      INTEGER,
  locale     TEXT    NOT NULL,
  name_loc   TEXT    NOT NULL,
  traits_loc TEXT,
  text_loc   TEXT    NOT NULL,
  source     TEXT
);

-- Unique per (kind, name NOCASE, level, locale). COALESCE maps NULL level to
-- -1 so that two records differing only in level-presence are still unique.
CREATE UNIQUE INDEX IF NOT EXISTS idx_translations_key
  ON translations(kind, name_key COLLATE NOCASE, COALESCE(level, -1), locale);

-- Lookup helper when UI needs all translations for a kind (diagnostics).
CREATE INDEX IF NOT EXISTS idx_translations_kind_locale
  ON translations(kind, locale);
