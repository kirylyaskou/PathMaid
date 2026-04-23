-- Per-instance cast-at rank: heightened casts записывают реальный уровень
-- каста так что engine-side @item.level вычисляется от cast rank, не от
-- spell base rank. NULL = cast at spell base rank (legacy behavior).
--
-- Callers that apply an effect without knowing the cast rank (EffectPicker
-- direct apply, item-granted effects) leave this NULL → SELECT fallback on
-- COALESCE(s.rank, 1) preserves pre-migration behavior exactly.
ALTER TABLE encounter_combatant_effects ADD COLUMN cast_at_rank INTEGER;
