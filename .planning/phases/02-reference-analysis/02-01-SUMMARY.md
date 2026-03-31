---
phase: 02-reference-analysis
plan: 01
subsystem: analysis
tags: [gap-analysis, pf2e, reference, conditions, iwr, actions, spells, feats, classes]
dependency_graph:
  requires: [engine/index.ts, refs/pf2e/]
  provides: [.planning/phases/02-reference-analysis/GAP-ANALYSIS.md]
  affects: [Phase 3 planning, Phase 4 planning]
tech_stack:
  added: []
  patterns: [direct-json-inspection, systematic-domain-analysis]
key_files:
  created:
    - .planning/phases/02-reference-analysis/GAP-ANALYSIS.md
  modified: []
decisions:
  - Single comprehensive GAP-ANALYSIS.md document (not split by domain) per D-05 recommendation
  - Summary-level detail per entry per D-05 recommendation — implementation detail deferred to Phases 3/4
  - refs/lib/ excluded per D-10 — contains extractor tooling only, no game mechanics
  - malevolence condition documented as adventure-specific (Malevolence AP), not a data error
  - holy/unholy identified as genuine Remaster damage types, need to add to DAMAGE_TYPES
  - abilities group is metadata-only (NOT mutual exclusion) — clumsy/drained/enfeebled/stupefied coexist
metrics:
  duration_seconds: 469
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_created: 1
  files_modified: 0
requirements_satisfied: [ANAL-01, ANAL-02]
---

# Phase 02 Plan 01: PF2e Gap Analysis Summary

**One-liner:** Comprehensive 12-domain gap analysis comparing 28,026 Foundry VTT PF2e JSON entries against engine/ TypeScript — 58 HIGH priority and 21 LOWER priority gaps documented.

## What Was Built

Produced `.planning/phases/02-reference-analysis/GAP-ANALYSIS.md` — a 1,185-line analysis document covering all 12 PF2e mechanical domains. Validated against direct inspection of representative JSON files from `refs/pf2e/`.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Analyze all 12 domains and produce GAP-ANALYSIS.md body | 59d75ca |
| 2 | Write executive summary and prioritized missing-mechanics master list | 3d18931 |

## Key Findings

### Coverage Assessment

| Domain | Engine State | Gap Severity |
|--------|-------------|--------------|
| Conditions & Statuses | 44 slugs, 2/5 groups, no Rule Elements | HIGH |
| Damage & IWR | Correct algorithm, ~50 type strings missing | HIGH |
| Modifier Math | Correct stacking rules, no statistics defined | HIGH |
| Encounter XP | Complete | NONE |
| Weak/Elite HP | Complete | NONE |
| Actions | **Zero coverage** | CRITICAL |
| Spells | **Zero coverage** | CRITICAL |
| Equipment & Weapons | **Zero coverage** | CRITICAL |
| Feats | **Zero coverage** | CRITICAL |
| Classes & Class Features | **Zero coverage** | CRITICAL |
| Creatures & Stat Blocks | WeakEliteTier only | CRITICAL |
| Ancestries & Heritages | **Zero coverage** | LOWER |
| Hazards | XP only | HIGH |
| Downtime | **Zero coverage** | LOWER |

### Content Pack Inventory

Total: **28,026 JSON entries** across **94 content pack directories** in `refs/pf2e/`. Top packs by size:
- feats: 5,861 entries
- equipment: 5,616 entries
- spells: 1,796 entries
- class-features: 826 entries
- pathfinder-monster-core: 492 entries

### Validated Schema Findings

All schemas documented from **direct file reading** (not assumptions):

- **Condition JSON:** `system.group | overrides | value.isValued | rules[]` — 5 condition groups confirmed (senses, abilities, death, detection, attitudes)
- **IWR JSON:** `{ type: string, value?: number, exceptions?: string[] }` — condition immunities (paralyzed, stunned) mix with damage immunities (fire, cold) in same array
- **Action JSON:** `system.actionType.value | actions.value | category | traits.value | rules[]` — basic actions have empty rules arrays
- **Creature JSON:** Full `system.*` schema documented — pre-calculated stats for NPCs vs. component-based for PCs
- **Spell JSON:** `system.area | damage | defense | heightening | time | traits.traditions` — two heightening types (fixed/interval)
- **Weapon JSON:** `system.damage | group | runes.potency | runes.striking | traits.value`
- **Armor JSON:** `system.acBonus | checkPenalty | dexCap | speedPenalty | strength | runes.resilient`
- **Class JSON:** `system.hp | attacks | defenses | saves | keyAbility | items (feature progression)`

## Decisions Made

1. **Single comprehensive document** — one GAP-ANALYSIS.md is more navigable than 12 domain files for downstream planners
2. **malevolence is intentional** — adventure-specific condition (Malevolence AP), not a core PF2e condition; documented as intentional in Open Questions
3. **holy/unholy are Remaster types** — confirmed as genuine Remaster damage types (not OGL legacy). Appear in `remaster: true` content. Need to add to DAMAGE_TYPES alongside vitality/void
4. **abilities group is non-exclusive** — clumsy, drained, enfeebled, stupefied affect different ability scores and coexist. Engine's group-exclusivity mechanism must NOT apply to this group
5. **senses group needs investigation** — blinded and concealed can coexist (different mechanics). The overrides field (not group) determines replacement. Phase 3 should validate senses group semantics.

## Deviations from Plan

None — plan executed exactly as written. All 12 domains covered, all specified JSON files read, all acceptance criteria met.

## Stubs / Known Limitations

None — this plan produces documentation only. No code stubs.

## Self-Check: PASSED

Verified after writing this SUMMARY:
- FOUND: .planning/phases/02-reference-analysis/GAP-ANALYSIS.md
- FOUND: .planning/phases/02-reference-analysis/02-01-SUMMARY.md
- FOUND: commit 59d75ca (Task 1)
- FOUND: commit 3d18931 (Task 2)
