# SMOKE-LIST.md — Phase 114: Verification + Untranslated Regression

**Phase:** 114-verification-untranslated-regression  
**Requirements addressed:** VERIFY-01, VERIFY-02, UNTRANS-02  
**Invocation:** Manual smoke during user UAT pass before v1.7.5 tag.  
**Source of creature names:** Verbatim from `vendor/pf2e-locale-ru/pf2e/packs/<pack>.json` `entries` keys — no fabricated entries.

---

## Pre-flight

Complete ALL steps before opening any creature panel.

### Steps

1. **Stop the running app** (if open).

2. **Delete local DB:**
   - Windows: `%APPDATA%\com.pathmaid.app\pathmaid.db`
   - Or from bash: `rm -f "$APPDATA/com.pathmaid.app/pathmaid.db"`

3. **Cold boot:**
   ```
   cd D:/pathmaid && pnpm tauri dev
   ```

4. **Wait for ingest completion** in devtools console:
   - `[ingest] bestiary-derived spell rows: added=0, suppressed=0` — Phase 113 indicator (zero AP spell rows added, all suppressed as duplicates)
   - Seed completion message for `entity_items`

5. **Set locale to Russian** in Settings (locale=ru).

6. Only now proceed to the smoke checklist below.

---

## Smoke Checklist — 13 AP Creatures

Each creature must be opened in the Creature Stat Block panel with locale=ru active.

### How to verify each row

For each creature, confirm the following sub-checks:

- `[ ] Name renders in RU at locale=ru`
- `[ ] Subtitle/traits render in RU`
- `[ ] At least one strike row shows RU name (and RU description if items[].description present)`
- `[ ] At least one ability card shows RU description (Tier 1 or Tier 2)`
- `[ ] No 🚫RU badge on creature header (UNTRANS-01: badge absent for translated creature)`

---

### Entry 1 — REFERENCE REPRO from Phase 112 SUMMARY

| Field | Value |
|-------|-------|
| **AP Pack** | `outlaws-of-alkenstar-bestiary` |
| **EN Name** | `"Lucky" Lanks` |
| **Expected RU Name** | `"Счастливчик" Лэнкс` |
| **Items count** | 9 |
| **Annotation** | Primary reference repro — strike "Финт негодяя" must render с full RU description via Tier-1 pack overlay |

Sub-checks:
- `[ ] Name renders as "Счастливчик" Лэнкс at locale=ru`
- `[ ] Subtitle/traits render in RU`
- `[ ] Strike row "Финт негодяя" renders with RU description (Tier-1 pack overlay)`
- `[ ] Ability card "Финт негодяя" renders RU description`
- `[ ] No 🚫RU badge on creature header (UNTRANS-01)`

---

### Entry 2

| Field | Value |
|-------|-------|
| **AP Pack** | `agents-of-edgewatch-bestiary` |
| **EN Name** | `Agradaemon` |
| **Expected RU Name** | `Аградэймон` |
| **Items count** | 11 |

Sub-checks:
- `[ ] Name renders in RU at locale=ru`
- `[ ] Subtitle/traits render in RU`
- `[ ] At least one strike row shows RU name (and RU description if items[].description present)`
- `[ ] At least one ability card shows RU description (Tier 1 or Tier 2)`
- `[ ] No 🚫RU badge on creature header (UNTRANS-01)`

---

### Entry 3

| Field | Value |
|-------|-------|
| **AP Pack** | `agents-of-edgewatch-bestiary` |
| **EN Name** | `Clockwork Amalgam` |
| **Expected RU Name** | `Заводная амальгама` |
| **Items count** | 11 |

Sub-checks:
- `[ ] Name renders in RU at locale=ru`
- `[ ] Subtitle/traits render in RU`
- `[ ] At least one strike row shows RU name (and RU description if items[].description present)`
- `[ ] At least one ability card shows RU description (Tier 1 or Tier 2)`
- `[ ] No 🚫RU badge on creature header (UNTRANS-01)`

---

### Entry 4

| Field | Value |
|-------|-------|
| **AP Pack** | `abomination-vaults-bestiary` |
| **EN Name** | `Aller Rosk` |
| **Expected RU Name** | `Аллер Роск` |
| **Items count** | 7 |

Sub-checks:
- `[ ] Name renders in RU at locale=ru`
- `[ ] Subtitle/traits render in RU`
- `[ ] At least one strike row shows RU name (and RU description if items[].description present)`
- `[ ] At least one ability card shows RU description (Tier 1 or Tier 2)`
- `[ ] No 🚫RU badge on creature header (UNTRANS-01)`

---

### Entry 5

| Field | Value |
|-------|-------|
| **AP Pack** | `abomination-vaults-bestiary` |
| **EN Name** | `Augrael` |
| **Expected RU Name** | `Ауграэль` |
| **Items count** | 9 |

Sub-checks:
- `[ ] Name renders in RU at locale=ru`
- `[ ] Subtitle/traits render in RU`
- `[ ] At least one strike row shows RU name (and RU description if items[].description present)`
- `[ ] At least one ability card shows RU description (Tier 1 or Tier 2)`
- `[ ] No 🚫RU badge on creature header (UNTRANS-01)`

---

### Entry 6

| Field | Value |
|-------|-------|
| **AP Pack** | `age-of-ashes-bestiary` |
| **EN Name** | `Charau-ka Dragon Priest` |
| **Expected RU Name** | `Чарау-ка драконий жрец` |
| **Items count** | 11 |

Sub-checks:
- `[ ] Name renders in RU at locale=ru`
- `[ ] Subtitle/traits render in RU`
- `[ ] At least one strike row shows RU name (and RU description if items[].description present)`
- `[ ] At least one ability card shows RU description (Tier 1 or Tier 2)`
- `[ ] No 🚫RU badge on creature header (UNTRANS-01)`

---

### Entry 7

| Field | Value |
|-------|-------|
| **AP Pack** | `extinction-curse-bestiary` |
| **EN Name** | `Lion Visitant` |
| **Expected RU Name** | `Замогильный лев` |
| **Items count** | 11 |

Sub-checks:
- `[ ] Name renders in RU at locale=ru`
- `[ ] Subtitle/traits render in RU`
- `[ ] At least one strike row shows RU name (and RU description if items[].description present)`
- `[ ] At least one ability card shows RU description (Tier 1 or Tier 2)`
- `[ ] No 🚫RU badge on creature header (UNTRANS-01)`

---

### Entry 8

| Field | Value |
|-------|-------|
| **AP Pack** | `kingmaker-bestiary` |
| **EN Name** | `Aecora Silverfire` |
| **Expected RU Name** | `Аэкора Сильверфайр` |
| **Items count** | 9 |

Sub-checks:
- `[ ] Name renders in RU at locale=ru`
- `[ ] Subtitle/traits render in RU`
- `[ ] At least one strike row shows RU name (and RU description if items[].description present)`
- `[ ] At least one ability card shows RU description (Tier 1 or Tier 2)`
- `[ ] No 🚫RU badge on creature header (UNTRANS-01)`

---

### Entry 9

| Field | Value |
|-------|-------|
| **AP Pack** | `strength-of-thousands-bestiary` |
| **EN Name** | `Anadi Fateweaver` |
| **Expected RU Name** | `Анади-ткач судьбы` |
| **Items count** | 9 |

Sub-checks:
- `[ ] Name renders in RU at locale=ru`
- `[ ] Subtitle/traits render in RU`
- `[ ] At least one strike row shows RU name (and RU description if items[].description present)`
- `[ ] At least one ability card shows RU description (Tier 1 or Tier 2)`
- `[ ] No 🚫RU badge on creature header (UNTRANS-01)`

---

### Entry 10

| Field | Value |
|-------|-------|
| **AP Pack** | `blood-lords-bestiary` |
| **EN Name** | `Arghun the Annihilator` |
| **Expected RU Name** | `Аргхун Аннигилятор` |
| **Items count** | 7 |

Sub-checks:
- `[ ] Name renders in RU at locale=ru`
- `[ ] Subtitle/traits render in RU`
- `[ ] At least one strike row shows RU name (and RU description if items[].description present)`
- `[ ] At least one ability card shows RU description (Tier 1 or Tier 2)`
- `[ ] No 🚫RU badge on creature header (UNTRANS-01)`

---

### Entry 11

| Field | Value |
|-------|-------|
| **AP Pack** | `rage-of-elements-bestiary` |
| **EN Name** | `Anemos` |
| **Expected RU Name** | `Анемой` |
| **Items count** | 20 |

Sub-checks:
- `[ ] Name renders in RU at locale=ru`
- `[ ] Subtitle/traits render in RU`
- `[ ] At least one strike row shows RU name (and RU description if items[].description present)`
- `[ ] At least one ability card shows RU description (Tier 1 or Tier 2)`
- `[ ] No 🚫RU badge on creature header (UNTRANS-01)`

---

### Entry 12

| Field | Value |
|-------|-------|
| **AP Pack** | `gatewalkers-bestiary` |
| **EN Name** | `Ainamuuren` |
| **Expected RU Name** | `Айнамуурен` |
| **Items count** | 13 |

Sub-checks:
- `[ ] Name renders in RU at locale=ru`
- `[ ] Subtitle/traits render in RU`
- `[ ] At least one strike row shows RU name (and RU description if items[].description present)`
- `[ ] At least one ability card shows RU description (Tier 1 or Tier 2)`
- `[ ] No 🚫RU badge on creature header (UNTRANS-01)`

---

### Entry 13 — PARTIAL COVERAGE

| Field | Value |
|-------|-------|
| **AP Pack** | `strength-of-thousands-bestiary` |
| **EN Name** | `Abendego Brute` |
| **Expected RU Name** | `Abendego Brute` (EN-as-RU in vendor — name not translated) |
| **Items count** | 6 |
| **Annotation** | PARTIAL COVERAGE — name is stored EN-as-RU in vendor; ability "Brute Strength" should still resolve via Tier-2 action-dict per Phase 112. Exercises multi-tier fallback chain. |

Sub-checks:
- `[ ] Creature is found and loads without error`
- `[ ] No 🚫RU badge on creature header — name present in vendor means badge absent even if name is EN-as-RU`
- `[ ] Ability "Brute Strength" renders RU description via Tier-2 action-dict (or Tier-1 if vendor provides description_loc)`
- `[ ] No fabricated translation appears for untranslated fields`

---

## UNTRANS-02 Homebrew Regression Section

Tests that the untranslated badge fires correctly for creatures with NO vendor entry. Validates UNTRANS-02 invariant.

- `[ ] Create a custom encounter with a homebrew creature (name not present in any vendor pack — e.g. "Test Goblin Scout v999")`
- `[ ] Verify 🚫RU badge IS present on creature header (regression check — UNTRANS-02 invariant — badge must fire when no translation exists)`
- `[ ] Verify name + subtitle render in EN (engine fallback)`
- `[ ] Verify no fabricated translation appears (badge is present precisely because translation === null)`

---

## Pass Criteria

- **VERIFY-01 PASS:** ≥10 of 13 entries pass all sub-checks.
- **REFERENCE REPRO GATE (non-negotiable):** Entries 1 ("Lucky" Lanks) and 13 (Abendego Brute) MUST pass their respective sub-checks. If either fails → file regression issue, do NOT proceed to version bump.
- **VERIFY-02 PASS:** All 4 homebrew regression checks PASS.
- **UNTRANS-02 PASS:** Badge fires for the homebrew creature, absent for all 13 AP creatures.

If any reference repro fails → stop, file issue, return to plan-phase for gap closure.
