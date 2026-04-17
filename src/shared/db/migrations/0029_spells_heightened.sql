-- Phase 59 / live-fix: store heighten spec on spells table.
--
-- Before this migration, sync dropped the heighten spec from Foundry JSON.
-- Result: a prepared caster at rank 6 with Fireball (base rank 3) still
-- displayed 6d6, not 12d6. See PF2e rules: https://2e.aonprd.com/Rules.aspx?ID=2225
--
-- heightened_json holds the parsed spec shape:
--   { type: 'interval', perRanks: number, damage: Record<key, string> }
-- or { type: 'fixed', levels: Record<string, { damage?: Record<key, string>, ... }> }
-- or NULL if the spell has no heightening.
--
-- Current SpellCard consumption supports the 'interval' shape (fireball,
-- lightning bolt, etc.) which covers the overwhelming majority of NPC spell
-- usage. 'fixed' heightening (magic missile-style) is parsed and stored for
-- later phases but not yet applied at display time.

ALTER TABLE spells ADD COLUMN heightened_json TEXT;
