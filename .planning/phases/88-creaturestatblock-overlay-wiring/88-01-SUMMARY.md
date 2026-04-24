---
phase: 88-creaturestatblock-overlay-wiring
plan: "01"
subsystem: ui
tags: [creature, ui, i18n, overlay, structured, markdown-lite, fsd, react]

requires:
  - phase: 87-api-hook-extension
    provides: TranslationRow.structured typed as MonsterStructuredLoc | null; @/shared/i18n barrel exports 7 types
  - phase: 84-html-parser-library
    provides: parseMonsterRuHtml emits markdown-lite ability descriptions; AbilityLoc.description contract

provides:
  - renderMarkdownLite(text) → ReactNode[] — pure function, zero deps, no dangerouslySetInnerHTML
  - CreatureSkillsLine: skillsLoc prop with engineKey-based RU name override
  - CreatureSpeedLine: speedsLoc prop with key-based pre-formatted label override
  - CreatureDefensesBlock: defensesLoc composite prop with IWR section labels + content override
  - CreatureStrikesSection + CreatureStrikeRow: strikesLoc/strikeLoc index-matched name+damageType override
  - CreatureAbilitiesSection: abilitiesLocByName Map prop with resolveAbilityLoc helper + markdown-lite rendering
  - CreatureStatBlock: useMemo derived slices wired to all 5 sub-components + spellcasting heading

affects:
  - future-monster-translation-phases (pattern established for structured overlay)

tech-stack:
  added: []
  patterns:
    - structured-overlay pattern: parent derives useMemo slices from translation.structured, passes to children as optional props; silent EN fallback everywhere
    - resolveAbilityLoc helper pattern: pure function resolves displayName/displayCost/displayTraits/locDescription from ability + optional AbilityLoc
    - markdown-lite renderer: regex-split + JSX fragments, no dangerouslySetInnerHTML, ReactNode[] output
    - index-based loc matching for abilities and strikes; engineKey-based for skills; key-based for speeds

key-files:
  created:
    - src/shared/lib/render-markdown-lite.tsx
  modified:
    - src/entities/creature/ui/CreatureSkillsLine.tsx
    - src/entities/creature/ui/CreatureSpeedLine.tsx
    - src/entities/creature/ui/CreatureDefensesBlock.tsx
    - src/entities/creature/ui/CreatureStrikesSection.tsx
    - src/entities/creature/ui/CreatureStrikeRow.tsx
    - src/entities/creature/ui/CreatureAbilitiesSection.tsx
    - src/entities/creature/ui/CreatureStatBlock.tsx

key-decisions:
  - "D-01 honored: prop drilling from parent, no context overhead"
  - "D-02 honored: abilities by index via Map<name, AbilityLoc>; skills by engineKey; speeds by key; strikes by index"
  - "D-03 honored: silent fallback everywhere — undefined prop or miss → EN unchanged, no console.warn"
  - "D-04 honored: renderMarkdownLite ≤50 lines, zero deps, no dangerouslySetInnerHTML"
  - "D-05 honored: actionCount null-aware fallback to engine value in resolveAbilityLoc"
  - "D-06 honored: legacy nameLoc/traitsLoc overlay unchanged; structured is additive layer"
  - "D-07 honored: tsc 0 errors, lint 0 new errors, lint:arch 0 new violations, zero deps diff"
  - "IIFE in JSX prevented: single-ability branch extracted to AbilityCardResolved sub-component"

requirements-completed: [TRANS-05]

duration: 7min
completed: "2026-04-24"
---

# Phase 88 Plan 01: CreatureStatBlock Overlay Wiring Summary

**RU structured overlay wired end-to-end: abilities/skills/speeds/strikes/defenses/spellcasting-heading in CreatureStatBlock via useMemo prop drilling + renderMarkdownLite pure renderer (zero deps, no dangerouslySetInnerHTML)**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-04-24T07:32:47Z
- **Completed:** 2026-04-24T07:40:46Z
- **Tasks:** 6 (T1–T5 with commits, T6 verification only)
- **Files modified:** 8 (1 created, 7 modified)

## Accomplishments

- `renderMarkdownLite` pure helper created: `**bold**`/`*italic*`/`\n`/`---` → JSX fragments, 44 lines, zero deps
- 5 sub-components extended with optional structured-loc props; all use silent EN fallback on undefined or length mismatch
- `CreatureStatBlock` parent wires all 5 slices via `useMemo` from `translation.structured`; spellcasting heading rendered above sections when `headingLabel` present
- Stray `console.log(creature)` debug call removed from parent
- All threat mitigations enforced: T-88-01 (no dangerouslySetInnerHTML), T-88-02 (pure-function, no throw)

## Task Commits

1. **Task 1: Create renderMarkdownLite helper** — `887640e7` (feat)
2. **Task 2: Extend leaf components (skills/speeds/defenses)** — `7eaf717f` (feat)
3. **Task 3: Extend strikes section + row** — `cda7612f` (feat)
4. **Task 4: Extend AbilitiesSection with markdown-lite** — `e8e07a4d` (feat)
5. **Task 5: Wire parent CreatureStatBlock** — `d8efcf57` (feat)
6. **Task 6: Full-project gates** — verification only, no commit

## Files Created/Modified

- `src/shared/lib/render-markdown-lite.tsx` — CREATED: pure renderer **bold**/*italic*/\n/--- → ReactNode[]
- `src/entities/creature/ui/CreatureSkillsLine.tsx` — MODIFIED: `skillsLoc?: SkillLoc[]` prop, engineKey-based lookup
- `src/entities/creature/ui/CreatureSpeedLine.tsx` — MODIFIED: `speedsLoc?: SpeedsLoc` prop, key-based label override
- `src/entities/creature/ui/CreatureDefensesBlock.tsx` — MODIFIED: `defensesLoc?: Partial<DefensesLoc>` composite prop, IWR labels + content
- `src/entities/creature/ui/CreatureStrikesSection.tsx` — MODIFIED: `strikesLoc?: StrikeLoc[]` threaded to rows by index
- `src/entities/creature/ui/CreatureStrikeRow.tsx` — MODIFIED: `strikeLoc?: StrikeLoc` name + damageType override; color mapping preserves engine key
- `src/entities/creature/ui/CreatureAbilitiesSection.tsx` — MODIFIED: `abilitiesLocByName?: Map<string, AbilityLoc>` prop; `resolveAbilityLoc` helper; `AbilityCardResolved` sub-component (no IIFE); markdown-lite for RU, highlightGameText for EN
- `src/entities/creature/ui/CreatureStatBlock.tsx` — MODIFIED: `import type AbilityLoc`; two useMemo slices; all 5 sub-components receive loc props; spellcasting heading; console.log removed

## Decisions Made

All D-01..D-07 honored per 88-CONTEXT.md:
- D-01: Prop drilling — explicit data flow, no context overhead
- D-02: Matching strategies — abilities/strikes by index; skills by engineKey; speeds by key
- D-03: Silent fallback — no console.warn anywhere in new code
- D-04: renderMarkdownLite — 44 lines, zero deps, no dangerouslySetInnerHTML; JSDoc explains contract
- D-05: actionCount null-aware — `loc?.actionCount ?? ability.actionCost` in resolveAbilityLoc
- D-06: Legacy overlay preserved — nameLoc/traitsLoc untouched; structured is additive
- D-07: All gates pass — tsc 0, lint 0 new errors, lint:arch 0 new violations, deps unchanged

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed IIFE in JSX from AbilitiesSection single-ability branch**
- **Found during:** Task 4 review (CLAUDE.md ESLint rule enforcement)
- **Issue:** Initial implementation used `{(() => { const ability = ...; return <AbilityCard/> })()}` in JSX — forbidden by CLAUDE.md `no-restricted-syntax`
- **Fix:** Extracted `AbilityCardResolved` sub-component; all three render branches (single/grid/reactions) use it
- **Files modified:** `src/entities/creature/ui/CreatureAbilitiesSection.tsx`
- **Verification:** Pattern check `\(\(\) => \{[\s\S]*?\}\)\(\)` returns no matches
- **Committed in:** `e8e07a4d`

---

**Total deviations:** 1 auto-fixed (Rule 1 — IIFE in JSX)
**Impact on plan:** CLAUDE.md compliance. No scope creep.

## Issues Encountered

None — plan executed cleanly after IIFE fix.

## Acceptance Criteria Status

| Criterion | Status |
|-----------|--------|
| `grep -c "export function renderMarkdownLite" render-markdown-lite.tsx` = 1 | PASS (1) |
| `grep -c "dangerouslySetInnerHTML" render-markdown-lite.tsx` = 0 | PASS (0) |
| render-markdown-lite.tsx ≤ 50 lines | PASS (44 lines) |
| `grep -c "skillsLoc?: SkillLoc\[\]" CreatureSkillsLine.tsx` >= 1 | PASS (1) |
| `grep -c "speedsLoc?: SpeedsLoc" CreatureSpeedLine.tsx` >= 1 | PASS (2) |
| `grep -c "defensesLoc?:" CreatureDefensesBlock.tsx` >= 1 | PASS (1) |
| `grep -c "strikesLoc?: StrikeLoc\[\]" CreatureStrikesSection.tsx` >= 1 | PASS (1) |
| `grep -c "strikeLoc?: StrikeLoc" CreatureStrikeRow.tsx` >= 1 | PASS (1) |
| `grep -c "abilitiesLocByName" CreatureAbilitiesSection.tsx` >= 2 | PASS (5) |
| `grep -c "renderMarkdownLite" CreatureAbilitiesSection.tsx` >= 1 | PASS (2) |
| `grep -c "abilitiesLocByName" CreatureStatBlock.tsx` >= 2 | PASS (2) |
| `grep -c "useMemo" CreatureStatBlock.tsx` increased by >= 2 | PASS (13 total) |
| `grep -c "spellcastingLoc?.headingLabel" CreatureStatBlock.tsx` >= 1 | PASS (1) |
| `grep -c "console.log(creature)" CreatureStatBlock.tsx` = 0 | PASS (0) |
| `grep -c "translation?.nameLoc" CreatureStatBlock.tsx` >= 1 | PASS (1) |
| `grep -c "translation?.traitsLoc" CreatureStatBlock.tsx` >= 1 | PASS (1) |
| No phase/version refs in new comments (8 files) | PASS (0 matches) |
| `pnpm tsc --noEmit` exits 0 | PASS |
| `pnpm lint` — 0 new errors in 8 modified files | PASS (2 pre-existing in i18n/index.ts:24-25 from prior phase) |
| `pnpm lint:arch` — 0 new violations in 8 modified files | PASS (all violations pre-existing in CreatureStatBlock entity cross-imports) |
| `git diff --exit-code package.json pnpm-lock.yaml` exits 0 | PASS |

## Threat Register Disposition

| ID | Category | Disposition | Enforced |
|----|----------|-------------|---------|
| T-88-01 | Tampering — HTML/script injection via markdown-lite | mitigate | No `dangerouslySetInnerHTML` anywhere; regex-split + JSX fragments only; verified by grep = 0 |
| T-88-02 | Tampering — renderer exception in React render | mitigate | Pure function, `String.split(regex)` cannot throw; empty string → `[]`; no try/catch needed |
| T-88-03 | Information Disclosure — console.warn payloads | accept | No console.warn in any Phase 88 file; only existing toRow() warn retained |
| T-88-04 | Repudiation — engine values overridden by RU labels | accept | damageTypeColor() uses engine `d.type`; roll handlers use `name` (engine canonical); only display text swapped |
| T-88-05 | DoS — large input to markdown-lite | accept | Ability descriptions bounded ~few KB; O(n) regex, `[^*]+` non-greedy, no exponential backtracking |
| T-88-06 | Elevation — new FSD imports | accept | All `import type` — zero runtime surface; `shared/lib/` correctly consumed from `entities/`; lint:arch 0 new violations |
| T-88-07 | Spoofing — bundled translation substitution | accept | In-tree static data; git history is audit trail; same surface as prior phases |

## Known Stubs / Deferred

1. **StatItem horizontal row labels (HP/AC/Fort/Ref/Will/Perception) stay EN** — `MonsterStructuredLoc` has `savesLoc` but it's not symmetrically used for the inline horizontal row (the row uses hardcoded "HP"/"AC"/"Fort" etc. in `CreatureStatBlock` lines 384–394). `savesLoc.fortLabel/refLabel/willLabel` exist in types but the StatItem layout expects short labels; wiring would require StatItem prop extension. Tracked as v1.8 enhancement.
2. **Spellcasting heading appears once above all sections** — parser emits one `headingLabel` per monster. Creatures with multiple distinct spellcasting traditions would show one heading for all sections. Acceptable for v1.7.0 monster scope (Succubus has one section). Parser contract extension needed for multi-tradition support.
3. **RU descriptions skip clickable-formula extraction** — `highlightGameText` is bypassed when `loc.description` present. Markdown-lite tokens don't carry roll formulas; engine numeric values are surfaced via separate strike/skill rows. Intentional trade-off documented in code comment.

## Human UAT Required

Cannot automate without running Tauri WebView. After `pnpm tauri dev`:

1. Open Bestiary → search "Succubus" → click card (ensure locale=ru in Settings)
2. **Verify RU overlay:**
   - Title: "Суккуб" (legacy nameLoc — pre-existing)
   - Traits: RU pills (legacy traitsLoc — pre-existing)
   - Defenses block: section labels "Уязвимости" / "Сопротивления" / "Иммунитеты", RU damage type labels, engine numeric values
   - Speed line: "25 футов" format, engine values drive tooltip
   - Strikes block: name "когти", damage type "режущий", +16 clickable, MAP buttons working
   - Abilities cards: RU names, RU descriptions with **bold** rendered (no raw markers), action icons, RU traits
   - Spellcasting heading: "Врождённые сакральные заклинания" above section
3. **Negative path:** Open a Foundry-only imported creature (no structured translation) — verify full EN render, no console errors
4. **Legacy fallback:** Find a creature with legacy `nameLoc`/`traitsLoc` only — verify RU name + traits, EN body, no console errors
5. **DevTools check:** Confirm no `console.warn` fires on stat block open (only pre-existing toRow() warn from missing structured data is acceptable)

## Self-Check: PASSED

All 9 files found (8 src + 1 SUMMARY). All 5 task commits verified in git log:
- `887640e7` T1: renderMarkdownLite
- `7eaf717f` T2: leaf components
- `cda7612f` T3: strikes
- `e8e07a4d` T4: AbilitiesSection
- `d8efcf57` T5: parent wiring
