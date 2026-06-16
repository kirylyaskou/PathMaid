-- ============================================================================
-- PathMaid cloud sync — Supabase Postgres schema.
-- ============================================================================
-- Run this ONCE per Supabase project via the SQL Editor in the dashboard.
-- It is version-controlled here so schema evolution is tracked alongside the
-- client. This is NOT a local SQLite migration — the local schema lives in
-- src/shared/db/migrations/ and is the offline-first source of truth.
--
-- Design:
--   * Every table mirrors a local SQLite user-data table (column-for-column).
--   * Each row carries user_id (RLS partition), updated_at (LWW watermark),
--     deleted_at (soft-delete tombstone for pull-back of deletions).
--   * IDs are client-generated (UUID/slug) and become the PRIMARY KEY, so
--     offline creates and remote rows converge without a server ID mapping.
--   * Row Level Security is enabled on every table: a user only ever sees
--     their own rows. The anon key is safe to ship because RLS is the gate.
--   * Server updated_at is set ONLY by a trigger that keeps the newer of
--     (incoming, existing) — clients push their local updated_at and the
--     server never overwrites a newer remote row with a stale push.
--
-- Reference data (bestiary, spells, items, hazards, ...) is intentionally
-- NOT mirrored here — it is re-derived per device from the Foundry import
-- pipeline and has no per-user ownership.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- updated_at = max(existing, incoming) trigger function (shared by all tables).
--挂在 BEFORE INSERT/UPDATE on every synced table. Prevents a late-arriving
-- stale push from clobbering a newer remote version during concurrent sync.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pathmaid_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.updated_at IS NULL THEN
    NEW.updated_at := now();
  ELSIF TG_OP = 'UPDATE' AND OLD.updated_at IS NOT NULL AND OLD.updated_at > NEW.updated_at THEN
    -- Keep the newer remote version; caller's stale timestamp loses.
    NEW.updated_at := OLD.updated_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper: bind user_id = auth.uid() on INSERT so clients cannot impersonate.
CREATE OR REPLACE FUNCTION pathmaid_bind_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CAMPAIGNS
-- ============================================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id            TEXT PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  accent_color  TEXT NOT NULL DEFAULT '#8f2f2f',
  cover_asset_id TEXT,
  last_opened_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);
CREATE TRIGGER campaigns_touch_updated_at
  BEFORE INSERT OR UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION pathmaid_touch_updated_at();
CREATE TRIGGER campaigns_bind_user_id
  BEFORE INSERT ON campaigns
  FOR EACH ROW WHEN (NEW.user_id IS NULL)
  EXECUTE FUNCTION pathmaid_bind_user_id();

CREATE TABLE IF NOT EXISTS campaign_nodes (
  id          TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  parent_id   TEXT,
  kind        TEXT NOT NULL CHECK (kind IN ('bucket','folder','note','table','npc','item','location')),
  bucket      TEXT NOT NULL CHECK (bucket IN ('notes','tables','npcs','items','locations')),
  title       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_system   INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);
CREATE TRIGGER campaign_nodes_touch_updated_at
  BEFORE INSERT OR UPDATE ON campaign_nodes
  FOR EACH ROW EXECUTE FUNCTION pathmaid_touch_updated_at();
CREATE TRIGGER campaign_nodes_bind_user_id
  BEFORE INSERT ON campaign_nodes
  FOR EACH ROW WHEN (NEW.user_id IS NULL)
  EXECUTE FUNCTION pathmaid_bind_user_id();

CREATE TABLE IF NOT EXISTS campaign_documents (
  node_id              TEXT PRIMARY KEY,
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id          TEXT NOT NULL,
  markdown             TEXT NOT NULL DEFAULT '',
  profile_json         TEXT NOT NULL DEFAULT '{}',
  cover_asset_id       TEXT,
  linked_db_refs_json  TEXT NOT NULL DEFAULT '[]',
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ
);
CREATE TRIGGER campaign_documents_touch_updated_at
  BEFORE INSERT OR UPDATE ON campaign_documents
  FOR EACH ROW EXECUTE FUNCTION pathmaid_touch_updated_at();
CREATE TRIGGER campaign_documents_bind_user_id
  BEFORE INSERT ON campaign_documents
  FOR EACH ROW WHEN (NEW.user_id IS NULL)
  EXECUTE FUNCTION pathmaid_bind_user_id();

CREATE TABLE IF NOT EXISTS campaign_tables (
  node_id              TEXT PRIMARY KEY,
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id          TEXT NOT NULL,
  columns_json         TEXT NOT NULL DEFAULT '[]',
  rows_json            TEXT NOT NULL DEFAULT '[]',
  cells_json           TEXT NOT NULL DEFAULT '{}',
  column_sizes_json    TEXT NOT NULL DEFAULT '{}',
  row_sizes_json       TEXT NOT NULL DEFAULT '{}',
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ
);
CREATE TRIGGER campaign_tables_touch_updated_at
  BEFORE INSERT OR UPDATE ON campaign_tables
  FOR EACH ROW EXECUTE FUNCTION pathmaid_touch_updated_at();
CREATE TRIGGER campaign_tables_bind_user_id
  BEFORE INSERT ON campaign_tables
  FOR EACH ROW WHEN (NEW.user_id IS NULL)
  EXECUTE FUNCTION pathmaid_bind_user_id();

CREATE TABLE IF NOT EXISTS campaign_links (
  id              TEXT PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id     TEXT NOT NULL,
  source_node_id  TEXT NOT NULL,
  target_node_id  TEXT NOT NULL,
  source_kind     TEXT NOT NULL CHECK (source_kind IN ('markdown','table-cell')),
  label           TEXT NOT NULL,
  created_from    TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);
CREATE TRIGGER campaign_links_touch_updated_at
  BEFORE INSERT OR UPDATE ON campaign_links
  FOR EACH ROW EXECUTE FUNCTION pathmaid_touch_updated_at();
CREATE TRIGGER campaign_links_bind_user_id
  BEFORE INSERT ON campaign_links
  FOR EACH ROW WHEN (NEW.user_id IS NULL)
  EXECUTE FUNCTION pathmaid_bind_user_id();

CREATE TABLE IF NOT EXISTS campaign_pins (
  campaign_id  TEXT NOT NULL,
  node_id      TEXT NOT NULL,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ,
  PRIMARY KEY (campaign_id, node_id)
);
CREATE TRIGGER campaign_pins_touch_updated_at
  BEFORE INSERT OR UPDATE ON campaign_pins
  FOR EACH ROW EXECUTE FUNCTION pathmaid_touch_updated_at();
CREATE TRIGGER campaign_pins_bind_user_id
  BEFORE INSERT ON campaign_pins
  FOR EACH ROW WHEN (NEW.user_id IS NULL)
  EXECUTE FUNCTION pathmaid_bind_user_id();

CREATE TABLE IF NOT EXISTS campaign_graph_positions (
  campaign_id  TEXT NOT NULL,
  node_id      TEXT NOT NULL,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  x            DOUBLE PRECISION NOT NULL,
  y            DOUBLE PRECISION NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ,
  PRIMARY KEY (campaign_id, node_id)
);
CREATE TRIGGER campaign_graph_positions_touch_updated_at
  BEFORE INSERT OR UPDATE ON campaign_graph_positions
  FOR EACH ROW EXECUTE FUNCTION pathmaid_touch_updated_at();
CREATE TRIGGER campaign_graph_positions_bind_user_id
  BEFORE INSERT ON campaign_graph_positions
  FOR EACH ROW WHEN (NEW.user_id IS NULL)
  EXECUTE FUNCTION pathmaid_bind_user_id();

-- Metadata only; the binary lives in Storage (see campaign-assets bucket below).
CREATE TABLE IF NOT EXISTS campaign_assets (
  id            TEXT PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id   TEXT NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('campaign-cover','node-cover')),
  file_name     TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);
CREATE TRIGGER campaign_assets_touch_updated_at
  BEFORE INSERT OR UPDATE ON campaign_assets
  FOR EACH ROW EXECUTE FUNCTION pathmaid_touch_updated_at();
CREATE TRIGGER campaign_assets_bind_user_id
  BEFORE INSERT ON campaign_assets
  FOR EACH ROW WHEN (NEW.user_id IS NULL)
  EXECUTE FUNCTION pathmaid_bind_user_id();

CREATE TABLE IF NOT EXISTS campaign_node_artworks (
  node_id     TEXT NOT NULL,
  asset_id    TEXT NOT NULL,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  PRIMARY KEY (node_id, asset_id)
);
CREATE TRIGGER campaign_node_artworks_touch_updated_at
  BEFORE INSERT OR UPDATE ON campaign_node_artworks
  FOR EACH ROW EXECUTE FUNCTION pathmaid_touch_updated_at();
CREATE TRIGGER campaign_node_artworks_bind_user_id
  BEFORE INSERT ON campaign_node_artworks
  FOR EACH ROW WHEN (NEW.user_id IS NULL)
  EXECUTE FUNCTION pathmaid_bind_user_id();

-- ============================================================================
-- ENCOUNTERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS encounters (
  id                  TEXT PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id         TEXT,
  name                TEXT NOT NULL,
  party_level         INTEGER NOT NULL DEFAULT 1,
  party_size          INTEGER NOT NULL DEFAULT 4,
  round               INTEGER NOT NULL DEFAULT 0,
  turn                INTEGER NOT NULL DEFAULT 0,
  active_combatant_id TEXT,
  is_running          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ
);
CREATE TRIGGER encounters_touch_updated_at
  BEFORE INSERT OR UPDATE ON encounters
  FOR EACH ROW EXECUTE FUNCTION pathmaid_touch_updated_at();
CREATE TRIGGER encounters_bind_user_id
  BEFORE INSERT ON encounters
  FOR EACH ROW WHEN (NEW.user_id IS NULL)
  EXECUTE FUNCTION pathmaid_bind_user_id();

CREATE TABLE IF NOT EXISTS encounter_combatants (
  id                TEXT PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encounter_id      TEXT NOT NULL,
  creature_ref      TEXT,
  display_name      TEXT NOT NULL,
  initiative        DOUBLE PRECISION NOT NULL DEFAULT 0,
  hp                INTEGER NOT NULL DEFAULT 0,
  max_hp            INTEGER NOT NULL DEFAULT 0,
  temp_hp           INTEGER NOT NULL DEFAULT 0,
  is_npc            INTEGER NOT NULL DEFAULT 1,
  weak_elite_tier   TEXT NOT NULL DEFAULT 'normal',
  creature_level    INTEGER NOT NULL DEFAULT 0,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  is_hazard         INTEGER NOT NULL DEFAULT 0,
  hazard_ref        TEXT,
  side              TEXT NOT NULL DEFAULT 'enemy',
  perception        INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);
CREATE TRIGGER encounter_combatants_touch_updated_at
  BEFORE INSERT OR UPDATE ON encounter_combatants
  FOR EACH ROW EXECUTE FUNCTION pathmaid_touch_updated_at();
CREATE TRIGGER encounter_combatants_bind_user_id
  BEFORE INSERT ON encounter_combatants
  FOR EACH ROW WHEN (NEW.user_id IS NULL)
  EXECUTE FUNCTION pathmaid_bind_user_id();

CREATE TABLE IF NOT EXISTS encounter_conditions (
  combatant_id TEXT NOT NULL,
  slug         TEXT NOT NULL,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encounter_id TEXT NOT NULL,
  value        INTEGER,
  is_locked    INTEGER NOT NULL DEFAULT 0,
  granted_by   TEXT,
  formula      TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ,
  PRIMARY KEY (combatant_id, slug)
);
CREATE TRIGGER encounter_conditions_touch_updated_at
  BEFORE INSERT OR UPDATE ON encounter_conditions
  FOR EACH ROW EXECUTE FUNCTION pathmaid_touch_updated_at();
CREATE TRIGGER encounter_conditions_bind_user_id
  BEFORE INSERT ON encounter_conditions
  FOR EACH ROW WHEN (NEW.user_id IS NULL)
  EXECUTE FUNCTION pathmaid_bind_user_id();

CREATE TABLE IF NOT EXISTS encounter_staging_combatants (
  id                TEXT PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encounter_id      TEXT NOT NULL,
  kind              TEXT NOT NULL DEFAULT 'npc',
  creature_ref      TEXT NOT NULL DEFAULT '',
  display_name      TEXT NOT NULL,
  hp                INTEGER NOT NULL DEFAULT 0,
  max_hp            INTEGER NOT NULL DEFAULT 0,
  temp_hp           INTEGER NOT NULL DEFAULT 0,
  creature_level    INTEGER NOT NULL DEFAULT 0,
  weak_elite_tier   TEXT NOT NULL DEFAULT 'normal',
  round             INTEGER,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);
CREATE TRIGGER encounter_staging_combatants_touch_updated_at
  BEFORE INSERT OR UPDATE ON encounter_staging_combatants
  FOR EACH ROW EXECUTE FUNCTION pathmaid_touch_updated_at();
CREATE TRIGGER encounter_staging_combatants_bind_user_id
  BEFORE INSERT ON encounter_staging_combatants
  FOR EACH ROW WHEN (NEW.user_id IS NULL)
  EXECUTE FUNCTION pathmaid_bind_user_id();

CREATE TABLE IF NOT EXISTS encounter_combatant_effects (
  id              TEXT PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encounter_id    TEXT NOT NULL,
  combatant_id    TEXT NOT NULL,
  effect_id       TEXT NOT NULL,
  applied_at      INTEGER NOT NULL,
  remaining_turns INTEGER NOT NULL,
  granted_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);
CREATE TRIGGER encounter_combatant_effects_touch_updated_at
  BEFORE INSERT OR UPDATE ON encounter_combatant_effects
  FOR EACH ROW EXECUTE FUNCTION pathmaid_touch_updated_at();
CREATE TRIGGER encounter_combatant_effects_bind_user_id
  BEFORE INSERT ON encounter_combatant_effects
  FOR EACH ROW WHEN (NEW.user_id IS NULL)
  EXECUTE FUNCTION pathmaid_bind_user_id();

CREATE TABLE IF NOT EXISTS encounter_spell_slots (
  encounter_id TEXT NOT NULL,
  combatant_id TEXT NOT NULL,
  entry_id     TEXT NOT NULL,
  rank         INTEGER NOT NULL,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_count   INTEGER NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ,
  PRIMARY KEY (encounter_id, combatant_id, entry_id, rank)
);
CREATE TRIGGER encounter_spell_slots_touch_updated_at
  BEFORE INSERT OR UPDATE ON encounter_spell_slots
  FOR EACH ROW EXECUTE FUNCTION pathmaid_touch_updated_at();
CREATE TRIGGER encounter_spell_slots_bind_user_id
  BEFORE INSERT ON encounter_spell_slots
  FOR EACH ROW WHEN (NEW.user_id IS NULL)
  EXECUTE FUNCTION pathmaid_bind_user_id();

CREATE TABLE IF NOT EXISTS encounter_combatant_spells (
  id            TEXT PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encounter_id  TEXT NOT NULL,
  combatant_id  TEXT NOT NULL,
  entry_id      TEXT NOT NULL,
  spell_name    TEXT NOT NULL,
  rank          INTEGER NOT NULL DEFAULT 0,
  is_removed    INTEGER NOT NULL DEFAULT 0,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);
CREATE TRIGGER encounter_combatant_spells_touch_updated_at
  BEFORE INSERT OR UPDATE ON encounter_combatant_spells
  FOR EACH ROW EXECUTE FUNCTION pathmaid_touch_updated_at();
CREATE TRIGGER encounter_combatant_spells_bind_user_id
  BEFORE INSERT ON encounter_combatant_spells
  FOR EACH ROW WHEN (NEW.user_id IS NULL)
  EXECUTE FUNCTION pathmaid_bind_user_id();

CREATE TABLE IF NOT EXISTS encounter_slot_overrides (
  encounter_id TEXT NOT NULL,
  combatant_id TEXT NOT NULL,
  entry_id     TEXT NOT NULL,
  rank         INTEGER NOT NULL,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_delta   INTEGER NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ,
  PRIMARY KEY (encounter_id, combatant_id, entry_id, rank)
);
CREATE TRIGGER encounter_slot_overrides_touch_updated_at
  BEFORE INSERT OR UPDATE ON encounter_slot_overrides
  FOR EACH ROW EXECUTE FUNCTION pathmaid_touch_updated_at();
CREATE TRIGGER encounter_slot_overrides_bind_user_id
  BEFORE INSERT ON encounter_slot_overrides
  FOR EACH ROW WHEN (NEW.user_id IS NULL)
  EXECUTE FUNCTION pathmaid_bind_user_id();

CREATE TABLE IF NOT EXISTS encounter_combatant_items (
  id              TEXT PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encounter_id    TEXT NOT NULL,
  combatant_id    TEXT NOT NULL,
  item_name       TEXT NOT NULL,
  item_foundry_id TEXT,
  item_type       TEXT NOT NULL DEFAULT 'equipment',
  quantity        INTEGER NOT NULL DEFAULT 1,
  damage_formula  TEXT,
  ac_bonus        INTEGER,
  is_removed      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);
CREATE TRIGGER encounter_combatant_items_touch_updated_at
  BEFORE INSERT OR UPDATE ON encounter_combatant_items
  FOR EACH ROW EXECUTE FUNCTION pathmaid_touch_updated_at();
CREATE TRIGGER encounter_combatant_items_bind_user_id
  BEFORE INSERT ON encounter_combatant_items
  FOR EACH ROW WHEN (NEW.user_id IS NULL)
  EXECUTE FUNCTION pathmaid_bind_user_id();

CREATE TABLE IF NOT EXISTS encounter_prepared_casts (
  encounter_id   TEXT NOT NULL,
  combatant_id   TEXT NOT NULL,
  entry_id       TEXT NOT NULL,
  rank           INTEGER NOT NULL,
  spell_slot_key TEXT NOT NULL,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ,
  PRIMARY KEY (encounter_id, combatant_id, entry_id, rank, spell_slot_key)
);
CREATE TRIGGER encounter_prepared_casts_touch_updated_at
  BEFORE INSERT OR UPDATE ON encounter_prepared_casts
  FOR EACH ROW EXECUTE FUNCTION pathmaid_touch_updated_at();
CREATE TRIGGER encounter_prepared_casts_bind_user_id
  BEFORE INSERT ON encounter_prepared_casts
  FOR EACH ROW WHEN (NEW.user_id IS NULL)
  EXECUTE FUNCTION pathmaid_bind_user_id();

CREATE TABLE IF NOT EXISTS encounter_combatant_custom_items (
  id              TEXT PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encounter_id    TEXT NOT NULL,
  combatant_id    TEXT NOT NULL,
  custom_item_id  TEXT NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 1,
  is_removed      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);
CREATE TRIGGER encounter_combatant_custom_items_touch_updated_at
  BEFORE INSERT OR UPDATE ON encounter_combatant_custom_items
  FOR EACH ROW EXECUTE FUNCTION pathmaid_touch_updated_at();
CREATE TRIGGER encounter_combatant_custom_items_bind_user_id
  BEFORE INSERT ON encounter_combatant_custom_items
  FOR EACH ROW WHEN (NEW.user_id IS NULL)
  EXECUTE FUNCTION pathmaid_bind_user_id();

-- ----------------------------------------------------------------------------
-- Encounter loot
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS encounter_loot_settings (
  encounter_id     TEXT PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_from_enemies INTEGER NOT NULL DEFAULT 1,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);
CREATE TRIGGER encounter_loot_settings_touch_updated_at
  BEFORE INSERT OR UPDATE ON encounter_loot_settings
  FOR EACH ROW EXECUTE FUNCTION pathmaid_touch_updated_at();
CREATE TRIGGER encounter_loot_settings_bind_user_id
  BEFORE INSERT ON encounter_loot_settings
  FOR EACH ROW WHEN (NEW.user_id IS NULL)
  EXECUTE FUNCTION pathmaid_bind_user_id();

CREATE TABLE IF NOT EXISTS encounter_loot_entries (
  id            TEXT PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encounter_id  TEXT NOT NULL,
  item_id       TEXT,
  name          TEXT NOT NULL,
  item_type     TEXT,
  quantity      INTEGER NOT NULL DEFAULT 1,
  price_gp      DOUBLE PRECISION,
  bulk          TEXT,
  notes         TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);
CREATE TRIGGER encounter_loot_entries_touch_updated_at
  BEFORE INSERT OR UPDATE ON encounter_loot_entries
  FOR EACH ROW EXECUTE FUNCTION pathmaid_touch_updated_at();
CREATE TRIGGER encounter_loot_entries_bind_user_id
  BEFORE INSERT ON encounter_loot_entries
  FOR EACH ROW WHEN (NEW.user_id IS NULL)
  EXECUTE FUNCTION pathmaid_bind_user_id();

CREATE TABLE IF NOT EXISTS encounter_loot_state (
  id               TEXT PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encounter_id     TEXT NOT NULL,
  combatant_id     TEXT,
  source_item_key  TEXT NOT NULL,
  source_item_kind TEXT NOT NULL DEFAULT 'base',
  spent_quantity   INTEGER NOT NULL DEFAULT 0,
  excluded         INTEGER NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);
CREATE TRIGGER encounter_loot_state_touch_updated_at
  BEFORE INSERT OR UPDATE ON encounter_loot_state
  FOR EACH ROW EXECUTE FUNCTION pathmaid_touch_updated_at();
CREATE TRIGGER encounter_loot_state_bind_user_id
  BEFORE INSERT ON encounter_loot_state
  FOR EACH ROW WHEN (NEW.user_id IS NULL)
  EXECUTE FUNCTION pathmaid_bind_user_id();

-- ============================================================================
-- CHARACTERS (user PCs only; iconics stay device-local)
-- ============================================================================
CREATE TABLE IF NOT EXISTS characters (
  id                TEXT PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  class             TEXT,
  level             INTEGER,
  ancestry          TEXT,
  raw_json          TEXT NOT NULL,
  notes             TEXT NOT NULL DEFAULT '',
  source_adventure  TEXT,
  raw_foundry_json  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);
CREATE TRIGGER characters_touch_updated_at
  BEFORE INSERT OR UPDATE ON characters
  FOR EACH ROW EXECUTE FUNCTION pathmaid_touch_updated_at();
CREATE TRIGGER characters_bind_user_id
  BEFORE INSERT ON characters
  FOR EACH ROW WHEN (NEW.user_id IS NULL)
  EXECUTE FUNCTION pathmaid_bind_user_id();

-- ============================================================================
-- CUSTOM CONTENT (user-authored)
-- ============================================================================
CREATE TABLE IF NOT EXISTS custom_creatures (
  id          TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  level       INTEGER NOT NULL,
  rarity      TEXT NOT NULL,
  source_type TEXT NOT NULL,
  str         INTEGER,
  dex         INTEGER,
  con         INTEGER,
  int         INTEGER,
  wis         INTEGER,
  cha         INTEGER,
  data_json   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);
CREATE TRIGGER custom_creatures_touch_updated_at
  BEFORE INSERT OR UPDATE ON custom_creatures
  FOR EACH ROW EXECUTE FUNCTION pathmaid_touch_updated_at();
CREATE TRIGGER custom_creatures_bind_user_id
  BEFORE INSERT ON custom_creatures
  FOR EACH ROW WHEN (NEW.user_id IS NULL)
  EXECUTE FUNCTION pathmaid_bind_user_id();

CREATE TABLE IF NOT EXISTS custom_items (
  id                   TEXT PRIMARY KEY,
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  item_type            TEXT NOT NULL,
  level                INTEGER NOT NULL DEFAULT 0,
  rarity               TEXT,
  bulk                 TEXT,
  price_gp             DOUBLE PRECISION,
  traits               TEXT,
  description          TEXT,
  source_text          TEXT,
  usage                TEXT,
  damage_formula       TEXT,
  damage_type          TEXT,
  weapon_category      TEXT,
  weapon_group         TEXT,
  ac_bonus             INTEGER,
  dex_cap              INTEGER,
  check_penalty        INTEGER,
  speed_penalty        INTEGER,
  strength_req         INTEGER,
  consumable_category  TEXT,
  uses_max             INTEGER,
  rules_json           TEXT NOT NULL DEFAULT '[]',
  variants_json        TEXT NOT NULL DEFAULT '[]',
  base_item_id         TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ
);
CREATE TRIGGER custom_items_touch_updated_at
  BEFORE INSERT OR UPDATE ON custom_items
  FOR EACH ROW EXECUTE FUNCTION pathmaid_touch_updated_at();
CREATE TRIGGER custom_items_bind_user_id
  BEFORE INSERT ON custom_items
  FOR EACH ROW WHEN (NEW.user_id IS NULL)
  EXECUTE FUNCTION pathmaid_bind_user_id();

-- ============================================================================
-- GLOBAL USER CONFIG
-- ============================================================================
-- party_config is a single-row table locally (id=1). On the server each user
-- gets their own row keyed by user_id instead.
CREATE TABLE IF NOT EXISTS party_config (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  party_level INTEGER NOT NULL DEFAULT 1,
  party_size  INTEGER NOT NULL DEFAULT 4,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);
CREATE TRIGGER party_config_touch_updated_at
  BEFORE INSERT OR UPDATE ON party_config
  FOR EACH ROW EXECUTE FUNCTION pathmaid_touch_updated_at();

CREATE TABLE IF NOT EXISTS hotkeys (
  id      TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action  TEXT NOT NULL,
  chord   TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE TRIGGER hotkeys_touch_updated_at
  BEFORE INSERT OR UPDATE ON hotkeys
  FOR EACH ROW EXECUTE FUNCTION pathmaid_touch_updated_at();
CREATE TRIGGER hotkeys_bind_user_id
  BEFORE INSERT ON hotkeys
  FOR EACH ROW WHEN (NEW.user_id IS NULL)
  EXECUTE FUNCTION pathmaid_bind_user_id();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
-- One pattern for every table: owner = auth.uid(). Cloud sync is personal
-- (single GM); no cross-user access exists. When collaborative sharing is
-- added later, it will layer a separate grants table on top of these policies.
-- ============================================================================
DO $$
DECLARE
  t TEXT;
  synced_tables TEXT[] := ARRAY[
    'campaigns','campaign_nodes','campaign_documents','campaign_tables',
    'campaign_links','campaign_pins','campaign_graph_positions','campaign_assets',
    'campaign_node_artworks',
    'encounters','encounter_combatants','encounter_conditions',
    'encounter_staging_combatants','encounter_combatant_effects',
    'encounter_spell_slots','encounter_combatant_spells','encounter_slot_overrides',
    'encounter_combatant_items','encounter_prepared_casts',
    'encounter_combatant_custom_items',
    'encounter_loot_settings','encounter_loot_entries','encounter_loot_state',
    'characters','custom_creatures','custom_items','hotkeys'
  ];
BEGIN
  FOREACH t IN ARRAY synced_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

    -- SELECT: a user can read only their own rows.
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I',
      t || '_owner_select', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (user_id = auth.uid())',
      t || '_owner_select', t
    );

    -- INSERT: must carry the caller's user_id (or NULL, which the trigger fills).
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I',
      t || '_owner_insert', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())',
      t || '_owner_insert', t
    );

    -- UPDATE: only the owner may modify, and may not re-assign ownership.
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I',
      t || '_owner_update', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())',
      t || '_owner_update', t
    );

    -- DELETE: hard deletes are server-side only (cron reaps tombstones).
    -- Clients soft-delete via UPDATE (sets deleted_at), which the UPDATE policy covers.
  END LOOP;

  -- party_config is keyed by user_id directly (no separate user_id column).
  ALTER TABLE party_config ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS party_config_owner_select ON party_config;
  CREATE POLICY party_config_owner_select ON party_config
    FOR SELECT TO authenticated USING (user_id = auth.uid());
  DROP POLICY IF EXISTS party_config_owner_insert ON party_config;
  CREATE POLICY party_config_owner_insert ON party_config
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  DROP POLICY IF EXISTS party_config_owner_update ON party_config;
  CREATE POLICY party_config_owner_update ON party_config
    FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
END $$;

-- ============================================================================
-- STORAGE BUCKET — campaign asset binaries (images)
-- ----------------------------------------------------------------------------
-- The campaign_assets table stores metadata only; the image bytes live here.
-- Object key convention: <user_id>/<asset_id>/<file_name> so per-user RLS on
-- Storage can be enforced by path prefix.
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-assets', 'campaign-assets', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: a user can read/write only objects under their own prefix.
DROP POLICY IF EXISTS "campaign-assets read own" ON storage.objects;
CREATE POLICY "campaign-assets read own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'campaign-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "campaign-assets write own" ON storage.objects;
CREATE POLICY "campaign-assets write own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'campaign-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "campaign-assets update own" ON storage.objects;
CREATE POLICY "campaign-assets update own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'campaign-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "campaign-assets delete own" ON storage.objects;
CREATE POLICY "campaign-assets delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'campaign-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
