# Engine API

The engine (`/engine`) is a pure TypeScript library implementing PF2e game rules. Import via `@engine` alias.

No React. No Tauri. No side effects. Safe to unit test in Node.js.

## Modules

### Conditions (`engine/conditions/`)

**`conditions.ts`**

```ts
CONDITION_SLUGS: readonly ConditionSlug[]
VALUED_CONDITIONS: readonly ConditionSlug[]   // conditions that have a numeric value
CONDITION_GROUPS: Record<string, ConditionSlug[]>

class ConditionManager {
  // Manages a set of conditions on a single actor.
  // Enforces mutual exclusion (clumsy vs clumsy 2 → keeps highest).
  // Handles auto-grants (enfeebled from certain sources also grants frightened).
}
```

**`condition-effects.ts`**

```ts
CONDITION_EFFECTS: Record<ConditionSlug, ConditionEffect[]>
CONDITION_OVERRIDES: Record<ConditionSlug, ConditionSlug[]>
CONDITION_GROUPS_EXTENDED: ...
EXCLUSIVE_GROUPS: ConditionSlug[][]
```

**`death-progression.ts`**

```ts
performRecoveryCheck(dyingValue: number, woundedValue: number): RecoveryCheckResult
getWoundedValueAfterStabilize(wounded: number): number
getDyingValueOnKnockout(wounded: number): number
```

---

### Damage (`engine/damage/`)

**`damage.ts`** — constants and types

```ts
DAMAGE_TYPES: readonly DamageType[]          // fire, cold, bludgeoning, ...
DAMAGE_CATEGORIES: readonly DamageCategory[] // physical, energy, other
PHYSICAL_DAMAGE_TYPES / ENERGY_DAMAGE_TYPES / OTHER_DAMAGE_TYPES
```

**`iwr.ts`** — Immunity / Weakness / Resistance

```ts
applyIWR(
  instances: DamageInstance[],
  immunities: Immunity[],
  weaknesses: Weakness[],
  resistances: Resistance[]
): IWRApplicationResult
```

**`iwr-utils.ts`**

```ts
parseIwrData(raw: unknown): IwrData
formatIwrType(type: string): string
```

**`damage-helpers.ts`**

```ts
DamageCategorization: Record<DamageType, DamageCategory>
nextDamageDieSize(current: DieSize): DieSize
```

---

### Degree of Success (`engine/degree-of-success/`)

```ts
calculateDegreeOfSuccess(roll: number, dc: number, bonus?: number): DegreeOfSuccess
// Returns: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'

upgradeDegree(degree: DegreeOfSuccess): DegreeOfSuccess
downgradeDegree(degree: DegreeOfSuccess): DegreeOfSuccess

basicSaveDamageMultiplier(degree: DegreeOfSuccess): number
// Returns: 0 | 0.5 | 1 | 2

INCAPACITATION_ADJUSTMENT: number  // -10 to DC for incapacitation trait vs higher-level targets
```

---

### Dice (`engine/dice/`)

```ts
parseFormula(formula: string): ParsedFormula
// Parses "2d6+4", "1d8 fire", etc.

rollDice(formula: string | ParsedFormula): Roll

heightenFormula(formula: string, heightenBonus: number): string
// Applies per-rank heightening to a damage formula
```

---

### Encounter (`engine/encounter/`)

**`xp.ts`**

```ts
calculateCreatureXP(creatureLevel: number, partyLevel: number): number
getHazardXp(hazardLevel: number, partyLevel: number, isComplex: boolean): number
calculateEncounterRating(totalXP: number, partySize: number): ThreatRating
// ThreatRating: 'trivial' | 'low' | 'moderate' | 'severe' | 'extreme'

calculateXP(
  creatures: EncounterCreatureEntry[],
  hazards: EncounterHazardEntry[],
  partyLevel: number,
  partySize: number
): EncounterResult

generateEncounterBudgets(partySize: number): Record<ThreatRating, number>
```

**`weak-elite.ts`**

```ts
getHpAdjustment(tier: WeakEliteTier, level: number): number
getStatAdjustment(tier: WeakEliteTier): number      // AC, saves, attack
getAdjustedLevel(tier: WeakEliteTier, level: number): number
getDamageAdjustment(tier: WeakEliteTier): number
getXpLevelDelta(tier: WeakEliteTier): number
```

**`apply-tier.ts`**

```ts
applyTierToStatBlock(
  stats: TierAdjustableStatBlock,
  tier: WeakEliteTier
): TierAdjustableStatBlock

shiftDamageFormulaConstant(formula: string, delta: number): string
```

---

### Modifiers (`engine/modifiers/`)

```ts
MODIFIER_TYPES: readonly ModifierType[]
// circumstance | item | status | untyped

class Modifier {
  constructor(params: { label: string; modifier: number; type: ModifierType; enabled?: boolean })
}

applyStackingRules(modifiers: Modifier[]): Modifier[]
// Applies PF2e stacking rules: only the highest modifier of each typed category applies

class StatisticModifier {
  // Aggregates modifiers for a single statistic
  get totalModifier(): number
  get breakdown(): string
}

class DamageDicePF2e {
  // Represents persistent damage dice (e.g. from fire damage)
}
```

---

### Statistics (`engine/statistics/`)

```ts
class Statistic {
  // Wraps a base value + modifiers → final value
}

class CreatureStatistics {
  // Builds all statistics for a creature from raw stat block data
  ac: Statistic
  fort: Statistic
  ref: Statistic
  will: Statistic
  perception: Statistic
  // ...
}

buildAttackModifierSets(creature: Creature): ...

computeStatModifier(
  base: number,
  modifiers: Modifier[],
  context: ConditionInput
): StatModifierResult
```

---

### Spell Effects (`engine/effects/`)

**`spell-effect-modifiers.ts`**

```ts
parseSpellEffectModifiers(rulesJson: unknown[]): SpellEffectModifierInput[]
parseSpellEffectResistances(rulesJson: unknown[]): ...
parseSpellEffectRollOptions(rulesJson: unknown[]): SpellEffectRollOption[]
parseSpellEffectRollTwice(rulesJson: unknown[]): SpellEffectRollTwice | null
```

**`fortune.ts`**

```ts
planFortuneRoll(inputs: FortuneInputs): FortuneRollPlan
// Resolves fortune/misfortune effects according to PF2e rules.
// fortune + misfortune cancel each other; two fortune effects = roll twice take higher
```

**`predicate-evaluator.ts`**

```ts
evaluatePredicate(
  predicate: PredicateNode,
  context: PredicateContext
): boolean
// Evaluates PF2e predicate expressions: { and: [...] }, { or: [...] }, { not: "..." }
```

**`predicate-context.ts`**

```ts
buildPredicateContext(actor: RawActorSnapshot): PredicateContext
buildActorFacts(actor: RawActorSnapshot): PredicateActorFacts
emptyPredicateContext(): PredicateContext
slugifyEffectName(name: string): string
```

---

### Creature Building (`engine/creature-building/`)

```ts
getBenchmark(level: number, kind: StatKind, tier: Tier): BenchmarkValue
classifyStat(value: number, level: number, kind: StatKind): Tier
// Tier: 'terrible' | 'low' | 'moderate' | 'high' | 'extreme'

BENCHMARK_TABLES: Record<StatKind, ...>
SAFE_ITEM_LEVEL_TABLE: number[]

ROLE_PRESETS: Record<RoleId, RolePreset>
applyRole(stats: ..., role: RoleId): AppliedRoleValues

runSanityChecks(stats: CreatureStatsForSanity): SanityIssue[]
// Returns warnings/errors for stats that are outside PF2e design guidelines

computeRecallKnowledgeDC(level: number, rarity: Rarity): number
getRecallKnowledgeSkills(creatureTypes: string[]): string[]
```

---

### PC (`engine/pc/`)

```ts
calculatePCMaxHP(level: number, conMod: number, classHP: number, ancestryHP: number): number
abilityModifier(score: number): number    // (score - 10) / 2 rounded down
proficiencyModifier(rank: number, level: number): number
SKILL_ABILITY: Record<string, AbilityKey>

// Pathbuilder export types
PathbuilderExport / PathbuilderBuild / PathbuilderAbilities / ...
```

---

### Spellcasting (`engine/spellcasting/`)

```ts
detectCasterProgression(slots: unknown): CasterProgression
// 'full' | 'half' | 'prepared' | 'spontaneous' | 'none'

getMaxRecommendedRank(level: number, progression: CasterProgression): number
```
