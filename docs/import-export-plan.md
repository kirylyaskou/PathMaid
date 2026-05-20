# Import/Export Implementation Plan

Goal: make Pathbuilder import easier and make exported encounters portable when they contain custom creatures.

Non-goals:
- Do not update onboarding documentation.
- Do not add new dependencies.
- Do not remove the existing JSON import fallback.

## Slice 1: Portable Encounter Exports

Files:
- `src/features/encounter-import/lib/export-encounter.ts`
- `src/features/encounter-import/lib/export-encounters-bundle.ts`
- `src/features/encounter-import/lib/parse-formats.ts`
- `src/features/encounter-import/lib/types.ts`
- `src/features/encounter-import/lib/match-combatants.ts`
- `src/features/encounter-import/lib/import-encounter.ts`
- `src/shared/api/custom-creatures.ts`

Plan:
1. Extend PathMaid encounter export schema with embedded custom creature snapshots.
2. Keep `pathmaiden-v1` and `pathmaid-bundle-v1` readable.
3. Export each referenced `custom_creatures` stat block once per exported file.
4. Parse embedded custom creature snapshots into import metadata.
5. During import, resolve custom creatures by name:
   - if missing, create with the original name;
   - if name exists, create `Name Copy - YYYY-MM-DD`;
   - if that also exists, create `Name Copy 2 - YYYY-MM-DD`, etc.
6. Rewire imported combatants to the newly created or existing custom creature id.

## Slice 2: Pathbuilder Input Adapter

Files:
- `src/features/characters/lib/pathbuilder-import.ts`
- `src/features/characters/ui/ImportDialog.tsx`
- `src/shared/api/characters.ts`

Plan:
1. Extract current JSON validation/parsing from the dialog into a pure helper.
2. Accept three inputs:
   - Pathbuilder export JSON;
   - pasted text containing JSON;
   - Pathbuilder URL or bare build id.
3. For URL/build id, request `https://pathbuilder2e.com/json.php?id=<id>`.
4. Detect Cloudflare/HTML responses and show a clear error that JSON import is still available.

## Slice 3: Import Pathbuilder As Creature

Files:
- `src/features/characters/lib/pathbuilder-to-creature.ts`
- `src/features/characters/ui/ImportDialog.tsx`
- `src/pages/characters/ui/CharactersPage.tsx`
- `src/shared/api/custom-creatures.ts`

Plan:
1. Add an import mode: character or creature.
2. Character mode keeps using `upsertCharacter`.
3. Creature mode converts `PathbuilderBuild` into `CreatureStatBlockData`.
4. Persist creature mode through `createCustomCreature(..., 'foundry_clone')`.
5. Use conservative derivation:
   - HP from existing `calculatePCMaxHP`;
   - saves, perception, skills, attacks from existing engine PF2e helpers;
   - AC from Pathbuilder `acTotal`;
   - speed/languages/traits/weapons/spells from Pathbuilder fields where available.

## Verification

Commands:
- `npm run typecheck`
- `npm run lint`
- `npm run lint:arch`
- `code-review-graph update --skip-flows`

Manual checks:
- Existing JSON character import still works.
- Pathbuilder URL either imports or gives a precise Cloudflare/remote-fetch error.
- Import as creature creates a custom creature.
- Exported encounter with custom creatures imports on a clean DB without skipped custom combatants.
