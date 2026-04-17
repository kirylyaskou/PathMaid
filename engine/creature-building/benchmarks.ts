// engine/creature-building/benchmarks.ts
//
// PF2e creature benchmark tables for GM-facing creature builder.
// Source of truth: Archives of Nethys, Building Creatures (GM Core pg. 112 onward)
// https://2e.aonprd.com/Rules.aspx?ID=2874
//
// Table shapes and Terrible-tier extrapolation formulas adapted from
// shemetz/pf2e-see-simple-scale-statistics (MIT License):
// https://github.com/shemetz/pf2e-see-simple-scale-statistics
//
// Tiers AoN defines natively vary by stat (see per-table comments). Tiers
// D-28 says we always expose (all 5) but which AoN doesn't provide are
// computed as linear extrapolations, using the shemetz formulas:
//   terrible = low - (moderate - low) - 1   (for ability/skill/AC/strike)
//   spellDC.low      = moderate - (high - moderate) - 1
//   spellDC.terrible = moderate - (high - moderate) * 2 - 2
//   hp.extreme  = highUpper + (highUpper - moderateUpper) + 1
//   hp.terrible = lowLower  - (moderateLower - lowLower)  - 1   (clamped to 1)
// Extrapolated values are marked with an inline `// extrapolated` comment.

import type { Tier, DamageBenchmark } from './types'

type TierMap = Record<Tier, number>

// ── Helpers ───────────────────────────────────────────────────────────────────

// Pitfall 7: clamp HP to >=1, spell DC to >=10, spell attack to >=0.
const clampHp = (v: number): number => Math.max(1, v)
const clampSpellDC = (v: number): number => Math.max(10, v)
const clampSpellAtk = (v: number): number => Math.max(0, v)

// ── Table data (AoN IDs cited per block) ──────────────────────────────────────

// AoN Rules ID: 2881 — Ability Modifier Scale
// Native tiers: extreme / high / moderate / low.
// Terrible extrapolated: terrible = low - (moderate - low) - 1
const ABILITY_MOD_RAW: Record<number, Omit<TierMap, 'terrible'>> = {
  [-1]: { extreme: 3, high: 2, moderate: 1, low: 0 },
  [0]:  { extreme: 3, high: 2, moderate: 1, low: 0 },
  [1]:  { extreme: 4, high: 3, moderate: 2, low: 1 },
  [2]:  { extreme: 4, high: 3, moderate: 2, low: 1 },
  [3]:  { extreme: 4, high: 3, moderate: 2, low: 1 },
  [4]:  { extreme: 5, high: 4, moderate: 3, low: 2 },
  [5]:  { extreme: 5, high: 4, moderate: 3, low: 2 },
  [6]:  { extreme: 5, high: 4, moderate: 3, low: 2 },
  [7]:  { extreme: 6, high: 5, moderate: 4, low: 3 },
  [8]:  { extreme: 6, high: 5, moderate: 4, low: 3 },
  [9]:  { extreme: 6, high: 5, moderate: 4, low: 3 },
  [10]: { extreme: 7, high: 6, moderate: 5, low: 4 },
  [11]: { extreme: 7, high: 6, moderate: 5, low: 4 },
  [12]: { extreme: 7, high: 6, moderate: 5, low: 4 },
  [13]: { extreme: 8, high: 7, moderate: 6, low: 5 },
  [14]: { extreme: 8, high: 7, moderate: 6, low: 5 },
  [15]: { extreme: 8, high: 7, moderate: 6, low: 5 },
  [16]: { extreme: 9, high: 8, moderate: 7, low: 6 },
  [17]: { extreme: 9, high: 8, moderate: 7, low: 6 },
  [18]: { extreme: 9, high: 8, moderate: 7, low: 6 },
  [19]: { extreme: 10, high: 9, moderate: 8, low: 7 },
  [20]: { extreme: 10, high: 9, moderate: 8, low: 7 },
  [21]: { extreme: 11, high: 10, moderate: 9, low: 8 },
  [22]: { extreme: 11, high: 10, moderate: 9, low: 8 },
  [23]: { extreme: 11, high: 10, moderate: 9, low: 8 },
  [24]: { extreme: 12, high: 11, moderate: 10, low: 9 },
}

// AoN Rules ID: 2882 — Perception Scale
// Native tiers: all 5 (extreme/high/moderate/low/terrible).
const PERCEPTION_RAW: Record<number, TierMap> = {
  [-1]: { extreme: 9,  high: 8,  moderate: 5,  low: 2,  terrible: 0 },
  [0]:  { extreme: 10, high: 9,  moderate: 6,  low: 3,  terrible: 1 },
  [1]:  { extreme: 11, high: 10, moderate: 7,  low: 4,  terrible: 2 },
  [2]:  { extreme: 12, high: 11, moderate: 8,  low: 5,  terrible: 3 },
  [3]:  { extreme: 14, high: 12, moderate: 9,  low: 6,  terrible: 4 },
  [4]:  { extreme: 15, high: 14, moderate: 11, low: 8,  terrible: 6 },
  [5]:  { extreme: 17, high: 15, moderate: 12, low: 9,  terrible: 7 },
  [6]:  { extreme: 18, high: 17, moderate: 14, low: 11, terrible: 8 },
  [7]:  { extreme: 20, high: 18, moderate: 15, low: 12, terrible: 10 },
  [8]:  { extreme: 21, high: 19, moderate: 16, low: 13, terrible: 11 },
  [9]:  { extreme: 23, high: 21, moderate: 18, low: 15, terrible: 12 },
  [10]: { extreme: 24, high: 22, moderate: 19, low: 16, terrible: 14 },
  [11]: { extreme: 26, high: 24, moderate: 21, low: 18, terrible: 15 },
  [12]: { extreme: 27, high: 25, moderate: 22, low: 19, terrible: 16 },
  [13]: { extreme: 29, high: 26, moderate: 23, low: 20, terrible: 18 },
  [14]: { extreme: 30, high: 28, moderate: 25, low: 22, terrible: 19 },
  [15]: { extreme: 32, high: 29, moderate: 26, low: 23, terrible: 20 },
  [16]: { extreme: 33, high: 30, moderate: 28, low: 25, terrible: 22 },
  [17]: { extreme: 35, high: 32, moderate: 29, low: 26, terrible: 23 },
  [18]: { extreme: 36, high: 33, moderate: 30, low: 27, terrible: 24 },
  [19]: { extreme: 38, high: 35, moderate: 32, low: 29, terrible: 26 },
  [20]: { extreme: 39, high: 36, moderate: 33, low: 30, terrible: 27 },
  [21]: { extreme: 41, high: 38, moderate: 35, low: 32, terrible: 28 },
  [22]: { extreme: 43, high: 39, moderate: 36, low: 33, terrible: 30 },
  [23]: { extreme: 44, high: 40, moderate: 37, low: 34, terrible: 31 },
  [24]: { extreme: 46, high: 42, moderate: 38, low: 36, terrible: 32 },
}

// AoN Rules ID: 2885 — Skills Scale
// Native tiers: extreme/high/moderate/low (Low is a range — use the upper value;
// "lower bound of Low" is captured implicitly by Terrible extrapolation).
// Terrible extrapolated: terrible = low - (moderate - low) - 1
const SKILL_RAW: Record<number, Omit<TierMap, 'terrible'>> = {
  [-1]: { extreme: 8,  high: 5,  moderate: 4,  low: 2 },
  [0]:  { extreme: 9,  high: 6,  moderate: 5,  low: 3 },
  [1]:  { extreme: 10, high: 7,  moderate: 6,  low: 4 },
  [2]:  { extreme: 11, high: 8,  moderate: 7,  low: 5 },
  [3]:  { extreme: 13, high: 10, moderate: 9,  low: 7 },
  [4]:  { extreme: 15, high: 12, moderate: 10, low: 8 },
  [5]:  { extreme: 16, high: 13, moderate: 12, low: 10 },
  [6]:  { extreme: 18, high: 15, moderate: 13, low: 11 },
  [7]:  { extreme: 20, high: 17, moderate: 15, low: 13 },
  [8]:  { extreme: 21, high: 18, moderate: 16, low: 14 },
  [9]:  { extreme: 23, high: 20, moderate: 18, low: 16 },
  [10]: { extreme: 25, high: 22, moderate: 19, low: 17 },
  [11]: { extreme: 26, high: 23, moderate: 21, low: 19 },
  [12]: { extreme: 28, high: 25, moderate: 22, low: 20 },
  [13]: { extreme: 30, high: 27, moderate: 24, low: 22 },
  [14]: { extreme: 31, high: 28, moderate: 25, low: 23 },
  [15]: { extreme: 33, high: 30, moderate: 27, low: 25 },
  [16]: { extreme: 34, high: 31, moderate: 28, low: 26 },
  [17]: { extreme: 36, high: 33, moderate: 30, low: 28 },
  [18]: { extreme: 37, high: 34, moderate: 31, low: 29 },
  [19]: { extreme: 39, high: 36, moderate: 33, low: 31 },
  [20]: { extreme: 40, high: 37, moderate: 34, low: 32 },
  [21]: { extreme: 42, high: 39, moderate: 36, low: 34 },
  [22]: { extreme: 44, high: 40, moderate: 37, low: 35 },
  [23]: { extreme: 45, high: 42, moderate: 38, low: 36 },
  [24]: { extreme: 46, high: 43, moderate: 40, low: 38 },
}

// AoN Rules ID: 2889 — Armor Class Scale
// Native tiers: extreme/high/moderate/low.
// Terrible extrapolated: terrible = low - (moderate - low) - 1
const AC_RAW: Record<number, Omit<TierMap, 'terrible'>> = {
  [-1]: { extreme: 18, high: 15, moderate: 14, low: 12 },
  [0]:  { extreme: 19, high: 16, moderate: 15, low: 13 },
  [1]:  { extreme: 19, high: 16, moderate: 15, low: 13 },
  [2]:  { extreme: 21, high: 18, moderate: 17, low: 15 },
  [3]:  { extreme: 22, high: 19, moderate: 18, low: 16 },
  [4]:  { extreme: 24, high: 21, moderate: 20, low: 18 },
  [5]:  { extreme: 25, high: 22, moderate: 21, low: 19 },
  [6]:  { extreme: 27, high: 24, moderate: 23, low: 21 },
  [7]:  { extreme: 28, high: 25, moderate: 24, low: 22 },
  [8]:  { extreme: 30, high: 27, moderate: 26, low: 24 },
  [9]:  { extreme: 31, high: 28, moderate: 27, low: 25 },
  [10]: { extreme: 33, high: 30, moderate: 29, low: 27 },
  [11]: { extreme: 34, high: 31, moderate: 30, low: 28 },
  [12]: { extreme: 36, high: 33, moderate: 32, low: 30 },
  [13]: { extreme: 37, high: 34, moderate: 33, low: 31 },
  [14]: { extreme: 39, high: 36, moderate: 35, low: 33 },
  [15]: { extreme: 40, high: 37, moderate: 36, low: 34 },
  [16]: { extreme: 42, high: 39, moderate: 38, low: 36 },
  [17]: { extreme: 43, high: 40, moderate: 39, low: 37 },
  [18]: { extreme: 45, high: 42, moderate: 41, low: 39 },
  [19]: { extreme: 46, high: 43, moderate: 42, low: 40 },
  [20]: { extreme: 48, high: 45, moderate: 44, low: 42 },
  [21]: { extreme: 49, high: 46, moderate: 45, low: 43 },
  [22]: { extreme: 51, high: 48, moderate: 47, low: 45 },
  [23]: { extreme: 52, high: 49, moderate: 48, low: 46 },
  [24]: { extreme: 54, high: 51, moderate: 50, low: 48 },
}

// AoN Rules ID: 2890 — Saving Throw Scale
// Native tiers: all 5 (extreme/high/moderate/low/terrible).
const SAVE_RAW: Record<number, TierMap> = {
  [-1]: { extreme: 9,  high: 8,  moderate: 5,  low: 2,  terrible: 0  },
  [0]:  { extreme: 10, high: 9,  moderate: 6,  low: 3,  terrible: 1  },
  [1]:  { extreme: 11, high: 10, moderate: 7,  low: 4,  terrible: 2  },
  [2]:  { extreme: 12, high: 11, moderate: 8,  low: 5,  terrible: 3  },
  [3]:  { extreme: 14, high: 12, moderate: 9,  low: 6,  terrible: 4  },
  [4]:  { extreme: 15, high: 14, moderate: 11, low: 8,  terrible: 6  },
  [5]:  { extreme: 17, high: 15, moderate: 12, low: 9,  terrible: 7  },
  [6]:  { extreme: 18, high: 17, moderate: 14, low: 11, terrible: 8  },
  [7]:  { extreme: 20, high: 18, moderate: 15, low: 12, terrible: 10 },
  [8]:  { extreme: 21, high: 19, moderate: 16, low: 13, terrible: 11 },
  [9]:  { extreme: 23, high: 21, moderate: 18, low: 15, terrible: 12 },
  [10]: { extreme: 24, high: 22, moderate: 19, low: 16, terrible: 14 },
  [11]: { extreme: 26, high: 24, moderate: 21, low: 18, terrible: 15 },
  [12]: { extreme: 27, high: 25, moderate: 22, low: 19, terrible: 16 },
  [13]: { extreme: 29, high: 26, moderate: 23, low: 20, terrible: 18 },
  [14]: { extreme: 30, high: 28, moderate: 25, low: 22, terrible: 19 },
  [15]: { extreme: 32, high: 29, moderate: 26, low: 23, terrible: 20 },
  [16]: { extreme: 33, high: 30, moderate: 28, low: 25, terrible: 22 },
  [17]: { extreme: 35, high: 32, moderate: 29, low: 26, terrible: 23 },
  [18]: { extreme: 36, high: 33, moderate: 30, low: 27, terrible: 24 },
  [19]: { extreme: 38, high: 35, moderate: 32, low: 29, terrible: 26 },
  [20]: { extreme: 39, high: 36, moderate: 33, low: 30, terrible: 27 },
  [21]: { extreme: 41, high: 38, moderate: 35, low: 32, terrible: 28 },
  [22]: { extreme: 43, high: 39, moderate: 36, low: 33, terrible: 30 },
  [23]: { extreme: 44, high: 40, moderate: 37, low: 34, terrible: 31 },
  [24]: { extreme: 46, high: 42, moderate: 38, low: 36, terrible: 32 },
}

// AoN Rules ID: 2891 — Hit Points Scale
// Native tiers: high / moderate / low (each is a range). We use the midpoint
// of each range as the tier value. Extreme and Terrible are extrapolated
// (D-28): extreme = highUpper + (highUpper - moderateUpper) + 1;
// terrible = lowLower - (moderateLower - lowLower) - 1, clamped to 1.
// Raw ranges captured below to compute tier midpoints AND extrapolation.
interface HpRange { high: [number, number]; moderate: [number, number]; low: [number, number] }
const HP_RANGES: Record<number, HpRange> = {
  [-1]: { high: [9, 8],       moderate: [7, 6],       low: [5, 4]       },
  [0]:  { high: [20, 17],     moderate: [16, 14],     low: [13, 11]     },
  [1]:  { high: [26, 24],     moderate: [21, 19],     low: [16, 14]     },
  [2]:  { high: [40, 36],     moderate: [32, 28],     low: [25, 21]     },
  [3]:  { high: [59, 53],     moderate: [48, 44],     low: [40, 36]     },
  [4]:  { high: [78, 72],     moderate: [63, 57],     low: [52, 48]     },
  [5]:  { high: [97, 91],     moderate: [78, 72],     low: [65, 59]     },
  [6]:  { high: [123, 115],   moderate: [99, 91],     low: [81, 73]     },
  [7]:  { high: [148, 140],   moderate: [119, 111],   low: [97, 89]     },
  [8]:  { high: [173, 165],   moderate: [139, 131],   low: [113, 105]   },
  [9]:  { high: [198, 190],   moderate: [159, 151],   low: [129, 121]   },
  [10]: { high: [223, 215],   moderate: [179, 171],   low: [145, 137]   },
  [11]: { high: [248, 240],   moderate: [199, 191],   low: [161, 153]   },
  [12]: { high: [273, 265],   moderate: [219, 211],   low: [177, 169]   },
  [13]: { high: [298, 290],   moderate: [239, 231],   low: [193, 185]   },
  [14]: { high: [323, 315],   moderate: [259, 251],   low: [209, 201]   },
  [15]: { high: [348, 340],   moderate: [279, 271],   low: [225, 217]   },
  [16]: { high: [373, 365],   moderate: [299, 291],   low: [241, 233]   },
  [17]: { high: [398, 390],   moderate: [319, 311],   low: [257, 249]   },
  [18]: { high: [423, 415],   moderate: [339, 331],   low: [273, 265]   },
  [19]: { high: [448, 440],   moderate: [359, 351],   low: [289, 281]   },
  [20]: { high: [473, 465],   moderate: [379, 371],   low: [305, 297]   },
  [21]: { high: [505, 495],   moderate: [405, 395],   low: [325, 315]   },
  [22]: { high: [544, 532],   moderate: [436, 424],   low: [350, 338]   },
  [23]: { high: [581, 569],   moderate: [466, 454],   low: [374, 362]   },
  [24]: { high: [633, 617],   moderate: [508, 492],   low: [407, 393]   },
}

// AoN Rules ID: 2893 — Resistance / Weakness
// AoN gives Max/Min range per level. We derive 5 tiers by linear interpolation
// from Max (extreme) to Min (terrible), clamped to a floor of 1.
interface RwRange { max: number; min: number }
const RW_RAW: Record<number, RwRange> = {
  [-1]: { max: 1,  min: 1  },
  [0]:  { max: 3,  min: 1  },
  [1]:  { max: 3,  min: 1  },
  [2]:  { max: 5,  min: 2  },
  [3]:  { max: 6,  min: 3  },
  [4]:  { max: 7,  min: 4  },
  [5]:  { max: 8,  min: 4  },
  [6]:  { max: 9,  min: 5  },
  [7]:  { max: 10, min: 5  },
  [8]:  { max: 11, min: 6  },
  [9]:  { max: 12, min: 6  },
  [10]: { max: 13, min: 7  },
  [11]: { max: 14, min: 7  },
  [12]: { max: 15, min: 8  },
  [13]: { max: 16, min: 8  },
  [14]: { max: 17, min: 9  },
  [15]: { max: 18, min: 9  },
  [16]: { max: 19, min: 9  },
  [17]: { max: 19, min: 10 },
  [18]: { max: 20, min: 10 },
  [19]: { max: 21, min: 11 },
  [20]: { max: 22, min: 11 },
  [21]: { max: 23, min: 12 },
  [22]: { max: 24, min: 12 },
  [23]: { max: 25, min: 13 },
  [24]: { max: 26, min: 13 },
}

// AoN Rules ID: 2896 — Strike Attack Bonus Scale
// Native tiers: extreme/high/moderate/low. Terrible extrapolated.
const STRIKE_ATTACK_RAW: Record<number, Omit<TierMap, 'terrible'>> = {
  [-1]: { extreme: 10, high: 8,  moderate: 6,  low: 4  },
  [0]:  { extreme: 10, high: 8,  moderate: 6,  low: 4  },
  [1]:  { extreme: 11, high: 9,  moderate: 7,  low: 5  },
  [2]:  { extreme: 13, high: 11, moderate: 9,  low: 7  },
  [3]:  { extreme: 14, high: 12, moderate: 10, low: 8  },
  [4]:  { extreme: 16, high: 14, moderate: 12, low: 9  },
  [5]:  { extreme: 17, high: 15, moderate: 13, low: 11 },
  [6]:  { extreme: 19, high: 17, moderate: 15, low: 12 },
  [7]:  { extreme: 20, high: 18, moderate: 16, low: 13 },
  [8]:  { extreme: 22, high: 20, moderate: 18, low: 15 },
  [9]:  { extreme: 23, high: 21, moderate: 19, low: 16 },
  [10]: { extreme: 25, high: 23, moderate: 21, low: 17 },
  [11]: { extreme: 27, high: 24, moderate: 22, low: 19 },
  [12]: { extreme: 28, high: 26, moderate: 24, low: 20 },
  [13]: { extreme: 29, high: 27, moderate: 25, low: 21 },
  [14]: { extreme: 31, high: 29, moderate: 27, low: 23 },
  [15]: { extreme: 32, high: 30, moderate: 28, low: 24 },
  [16]: { extreme: 34, high: 32, moderate: 30, low: 25 },
  [17]: { extreme: 35, high: 33, moderate: 31, low: 27 },
  [18]: { extreme: 37, high: 35, moderate: 33, low: 28 },
  [19]: { extreme: 38, high: 36, moderate: 34, low: 29 },
  [20]: { extreme: 40, high: 38, moderate: 36, low: 31 },
  [21]: { extreme: 41, high: 39, moderate: 37, low: 32 },
  [22]: { extreme: 43, high: 41, moderate: 39, low: 33 },
  [23]: { extreme: 44, high: 42, moderate: 40, low: 35 },
  [24]: { extreme: 46, high: 44, moderate: 42, low: 36 },
}

// AoN Rules ID: 2897 — Strike Damage Scale
// Native tiers: extreme/high/moderate/low. Terrible extrapolated from low (same
// formula but applied to .expected; formula string reused with reduced modifier).
// Value per AoN is a damage expression + expected average (Pitfall 4).
interface DamageRow { extreme: DamageBenchmark; high: DamageBenchmark; moderate: DamageBenchmark; low: DamageBenchmark }
const STRIKE_DAMAGE_RAW: Record<number, DamageRow> = {
  [-1]: { extreme: { formula: '1d6+1',   expected: 4  }, high: { formula: '1d4+1',   expected: 3  }, moderate: { formula: '1d4+1',   expected: 3  }, low: { formula: '1d4',     expected: 2  } },
  [0]:  { extreme: { formula: '1d6+3',   expected: 6  }, high: { formula: '1d6+2',   expected: 5  }, moderate: { formula: '1d4+2',   expected: 4  }, low: { formula: '1d4+1',   expected: 3  } },
  [1]:  { extreme: { formula: '1d8+4',   expected: 8  }, high: { formula: '1d6+3',   expected: 6  }, moderate: { formula: '1d6+2',   expected: 5  }, low: { formula: '1d4+2',   expected: 4  } },
  [2]:  { extreme: { formula: '1d12+4',  expected: 11 }, high: { formula: '1d10+4',  expected: 9  }, moderate: { formula: '1d8+4',   expected: 8  }, low: { formula: '1d6+3',   expected: 6  } },
  [3]:  { extreme: { formula: '1d12+7',  expected: 13 }, high: { formula: '1d10+6',  expected: 11 }, moderate: { formula: '1d8+5',   expected: 9  }, low: { formula: '1d6+4',   expected: 7  } },
  [4]:  { extreme: { formula: '2d10+7',  expected: 18 }, high: { formula: '2d8+6',   expected: 15 }, moderate: { formula: '2d6+5',   expected: 12 }, low: { formula: '2d4+4',   expected: 9  } },
  [5]:  { extreme: { formula: '2d12+7',  expected: 20 }, high: { formula: '2d10+6',  expected: 17 }, moderate: { formula: '2d8+5',   expected: 14 }, low: { formula: '2d6+4',   expected: 11 } },
  [6]:  { extreme: { formula: '2d12+9',  expected: 22 }, high: { formula: '2d10+8',  expected: 19 }, moderate: { formula: '2d8+7',   expected: 16 }, low: { formula: '2d6+6',   expected: 13 } },
  [7]:  { extreme: { formula: '2d12+11', expected: 24 }, high: { formula: '2d10+10', expected: 21 }, moderate: { formula: '2d8+9',   expected: 18 }, low: { formula: '2d6+8',   expected: 15 } },
  [8]:  { extreme: { formula: '2d12+13', expected: 26 }, high: { formula: '2d10+12', expected: 23 }, moderate: { formula: '2d8+11',  expected: 20 }, low: { formula: '2d6+10',  expected: 17 } },
  [9]:  { extreme: { formula: '2d12+15', expected: 28 }, high: { formula: '2d10+14', expected: 25 }, moderate: { formula: '2d8+13',  expected: 22 }, low: { formula: '2d6+12',  expected: 19 } },
  [10]: { extreme: { formula: '2d12+17', expected: 30 }, high: { formula: '2d10+16', expected: 27 }, moderate: { formula: '2d8+15',  expected: 24 }, low: { formula: '2d6+14',  expected: 21 } },
  [11]: { extreme: { formula: '2d12+19', expected: 32 }, high: { formula: '2d10+18', expected: 29 }, moderate: { formula: '2d8+17',  expected: 26 }, low: { formula: '2d6+16',  expected: 23 } },
  [12]: { extreme: { formula: '3d12+19', expected: 38 }, high: { formula: '3d10+17', expected: 33 }, moderate: { formula: '3d8+15',  expected: 28 }, low: { formula: '3d6+13',  expected: 24 } },
  [13]: { extreme: { formula: '3d12+21', expected: 40 }, high: { formula: '3d10+19', expected: 35 }, moderate: { formula: '3d8+17',  expected: 30 }, low: { formula: '3d6+15',  expected: 26 } },
  [14]: { extreme: { formula: '3d12+23', expected: 42 }, high: { formula: '3d10+21', expected: 37 }, moderate: { formula: '3d8+19',  expected: 32 }, low: { formula: '3d6+17',  expected: 28 } },
  [15]: { extreme: { formula: '3d12+25', expected: 44 }, high: { formula: '3d10+23', expected: 39 }, moderate: { formula: '3d8+21',  expected: 34 }, low: { formula: '3d6+19',  expected: 30 } },
  [16]: { extreme: { formula: '3d12+27', expected: 46 }, high: { formula: '3d10+25', expected: 41 }, moderate: { formula: '3d8+23',  expected: 36 }, low: { formula: '3d6+21',  expected: 32 } },
  [17]: { extreme: { formula: '3d12+29', expected: 48 }, high: { formula: '3d10+27', expected: 43 }, moderate: { formula: '3d8+25',  expected: 38 }, low: { formula: '3d6+23',  expected: 34 } },
  [18]: { extreme: { formula: '3d12+31', expected: 50 }, high: { formula: '3d10+29', expected: 45 }, moderate: { formula: '3d8+27',  expected: 40 }, low: { formula: '3d6+25',  expected: 36 } },
  [19]: { extreme: { formula: '4d12+29', expected: 55 }, high: { formula: '4d10+27', expected: 49 }, moderate: { formula: '4d8+25',  expected: 43 }, low: { formula: '4d6+23',  expected: 37 } },
  [20]: { extreme: { formula: '4d12+31', expected: 57 }, high: { formula: '4d10+29', expected: 51 }, moderate: { formula: '4d8+27',  expected: 45 }, low: { formula: '4d6+25',  expected: 39 } },
  [21]: { extreme: { formula: '4d12+33', expected: 59 }, high: { formula: '4d10+31', expected: 53 }, moderate: { formula: '4d8+29',  expected: 47 }, low: { formula: '4d6+27',  expected: 41 } },
  [22]: { extreme: { formula: '4d12+35', expected: 61 }, high: { formula: '4d10+33', expected: 55 }, moderate: { formula: '4d8+31',  expected: 49 }, low: { formula: '4d6+29',  expected: 43 } },
  [23]: { extreme: { formula: '4d12+37', expected: 63 }, high: { formula: '4d10+35', expected: 57 }, moderate: { formula: '4d8+33',  expected: 51 }, low: { formula: '4d6+31',  expected: 45 } },
  [24]: { extreme: { formula: '4d12+39', expected: 65 }, high: { formula: '4d10+37', expected: 59 }, moderate: { formula: '4d8+35',  expected: 53 }, low: { formula: '4d6+33',  expected: 47 } },
}

// AoN Rules ID: 2899 — Spell DC / Spell Attack Scale
// Native tiers: extreme/high/moderate. Low and Terrible extrapolated.
// (Spell Attack = Spell DC - 10 in AoN tables, derived on the fly.)
const SPELL_DC_RAW: Record<number, { extreme: number; high: number; moderate: number }> = {
  [-1]: { extreme: 19, high: 18, moderate: 15 },
  [0]:  { extreme: 19, high: 18, moderate: 15 },
  [1]:  { extreme: 20, high: 19, moderate: 16 },
  [2]:  { extreme: 22, high: 21, moderate: 18 },
  [3]:  { extreme: 23, high: 22, moderate: 19 },
  [4]:  { extreme: 25, high: 24, moderate: 21 },
  [5]:  { extreme: 26, high: 25, moderate: 22 },
  [6]:  { extreme: 27, high: 27, moderate: 24 },
  [7]:  { extreme: 29, high: 28, moderate: 25 },
  [8]:  { extreme: 30, high: 30, moderate: 27 },
  [9]:  { extreme: 32, high: 31, moderate: 28 },
  [10]: { extreme: 33, high: 33, moderate: 30 },
  [11]: { extreme: 34, high: 34, moderate: 31 },
  [12]: { extreme: 36, high: 36, moderate: 33 },
  [13]: { extreme: 37, high: 37, moderate: 34 },
  [14]: { extreme: 39, high: 39, moderate: 36 },
  [15]: { extreme: 40, high: 40, moderate: 37 },
  [16]: { extreme: 42, high: 42, moderate: 39 },
  [17]: { extreme: 43, high: 43, moderate: 40 },
  [18]: { extreme: 45, high: 45, moderate: 42 },
  [19]: { extreme: 46, high: 46, moderate: 43 },
  [20]: { extreme: 48, high: 48, moderate: 45 },
  [21]: { extreme: 49, high: 49, moderate: 46 },
  [22]: { extreme: 51, high: 51, moderate: 48 },
  [23]: { extreme: 52, high: 52, moderate: 49 },
  [24]: { extreme: 54, high: 54, moderate: 51 },
}

// AoN Rules ID: 2887 — Safe Item Level (single integer per creature level).
const SAFE_ITEM_LEVEL_RAW: Record<number, number> = {
  [-1]: 0,  [0]: 0,  [1]: 0,  [2]: 1,  [3]: 2,  [4]: 3,
  [5]: 4,   [6]: 5,  [7]: 6,  [8]: 7,  [9]: 8,  [10]: 9,
  [11]: 10, [12]: 11, [13]: 12, [14]: 13, [15]: 14, [16]: 15,
  [17]: 16, [18]: 17, [19]: 18, [20]: 19, [21]: 20, [22]: 20,
  [23]: 20, [24]: 20,
}

// AoN Rules ID: 2910 — Area Damage (unlimited-use vs limited-use).
// Keyed by level only (no tier). expected = average of formula.
const AREA_DAMAGE_UNLIMITED_RAW: Record<number, DamageBenchmark> = {
  [-1]: { formula: '1d4',    expected: 2  },
  [0]:  { formula: '1d6',    expected: 4  },
  [1]:  { formula: '1d6',    expected: 4  },
  [2]:  { formula: '2d4',    expected: 5  },
  [3]:  { formula: '2d6',    expected: 7  },
  [4]:  { formula: '3d6',    expected: 11 },
  [5]:  { formula: '4d6',    expected: 14 },
  [6]:  { formula: '4d6',    expected: 14 },
  [7]:  { formula: '5d6',    expected: 18 },
  [8]:  { formula: '5d6',    expected: 18 },
  [9]:  { formula: '6d6',    expected: 21 },
  [10]: { formula: '6d6',    expected: 21 },
  [11]: { formula: '7d6',    expected: 25 },
  [12]: { formula: '7d6',    expected: 25 },
  [13]: { formula: '8d6',    expected: 28 },
  [14]: { formula: '8d6',    expected: 28 },
  [15]: { formula: '9d6',    expected: 32 },
  [16]: { formula: '9d6',    expected: 32 },
  [17]: { formula: '10d6',   expected: 35 },
  [18]: { formula: '10d6',   expected: 35 },
  [19]: { formula: '11d6',   expected: 39 },
  [20]: { formula: '11d6',   expected: 39 },
  [21]: { formula: '12d6',   expected: 42 },
  [22]: { formula: '12d6',   expected: 42 },
  [23]: { formula: '13d6',   expected: 46 },
  [24]: { formula: '13d6',   expected: 46 },
}

const AREA_DAMAGE_LIMITED_RAW: Record<number, DamageBenchmark> = {
  [-1]: { formula: '1d6',    expected: 4  },
  [0]:  { formula: '1d8',    expected: 5  },
  [1]:  { formula: '2d6',    expected: 7  },
  [2]:  { formula: '3d6',    expected: 11 },
  [3]:  { formula: '4d6',    expected: 14 },
  [4]:  { formula: '5d6',    expected: 18 },
  [5]:  { formula: '6d6',    expected: 21 },
  [6]:  { formula: '7d6',    expected: 25 },
  [7]:  { formula: '8d6',    expected: 28 },
  [8]:  { formula: '9d6',    expected: 32 },
  [9]:  { formula: '10d6',   expected: 35 },
  [10]: { formula: '11d6',   expected: 39 },
  [11]: { formula: '12d6',   expected: 42 },
  [12]: { formula: '13d6',   expected: 46 },
  [13]: { formula: '14d6',   expected: 49 },
  [14]: { formula: '15d6',   expected: 53 },
  [15]: { formula: '16d6',   expected: 56 },
  [16]: { formula: '17d6',   expected: 60 },
  [17]: { formula: '18d6',   expected: 63 },
  [18]: { formula: '19d6',   expected: 67 },
  [19]: { formula: '20d6',   expected: 70 },
  [20]: { formula: '21d6',   expected: 74 },
  [21]: { formula: '22d6',   expected: 77 },
  [22]: { formula: '23d6',   expected: 81 },
  [23]: { formula: '24d6',   expected: 84 },
  [24]: { formula: '25d6',   expected: 88 },
}

// ── Extrapolation + table materialisation ─────────────────────────────────────

const LEVELS: number[] = []
for (let l = -1; l <= 24; l++) LEVELS.push(l)

// Build "extreme/high/moderate/low + extrapolated terrible" table.
function withTerribleFrom(raw: Record<number, Omit<TierMap, 'terrible'>>): Record<number, TierMap> {
  const out: Record<number, TierMap> = {}
  for (const L of LEVELS) {
    const r = raw[L]
    const terrible = r.low - (r.moderate - r.low) - 1 // extrapolated
    out[L] = { extreme: r.extreme, high: r.high, moderate: r.moderate, low: r.low, terrible }
  }
  return out
}

// Build HP table from ranges + extrapolated extreme + extrapolated terrible.
function buildHpTable(): Record<number, TierMap> {
  const out: Record<number, TierMap> = {}
  for (const L of LEVELS) {
    const r = HP_RANGES[L]
    const [highUpper, highLower] = r.high
    const [moderateUpper, moderateLower] = r.moderate
    const [lowUpper, lowLower] = r.low
    const high = Math.round((highUpper + highLower) / 2)
    const moderate = Math.round((moderateUpper + moderateLower) / 2)
    const low = Math.round((lowUpper + lowLower) / 2)
    // extreme = highUpper + (highUpper - moderateUpper) + 1 (extrapolated)
    const extreme = clampHp(highUpper + (highUpper - moderateUpper) + 1)
    // terrible = lowLower - (moderateLower - lowLower) - 1 (extrapolated, clamped)
    const terrible = clampHp(lowLower - (moderateLower - lowLower) - 1)
    out[L] = { extreme, high, moderate, low, terrible }
  }
  return out
}

// Build Resistance/Weakness table by linear interpolation Max..Min, clamped to 1.
function buildResistanceTable(): Record<number, TierMap> {
  const out: Record<number, TierMap> = {}
  for (const L of LEVELS) {
    const { max, min } = RW_RAW[L]
    const step = (max - min) / 4
    out[L] = {
      extreme:  Math.max(1, Math.round(max)),
      high:     Math.max(1, Math.round(max - step)),
      moderate: Math.max(1, Math.round(max - step * 2)),
      low:      Math.max(1, Math.round(max - step * 3)),
      terrible: Math.max(1, Math.round(min)),
    }
  }
  return out
}

// Build Spell DC table with extrapolated low + terrible.
function buildSpellDcTable(): Record<number, TierMap> {
  const out: Record<number, TierMap> = {}
  for (const L of LEVELS) {
    const r = SPELL_DC_RAW[L]
    // low = moderate - (high - moderate) - 1
    const low = clampSpellDC(r.moderate - (r.high - r.moderate) - 1)
    // terrible = moderate - (high - moderate) * 2 - 2
    const terrible = clampSpellDC(r.moderate - (r.high - r.moderate) * 2 - 2)
    out[L] = { extreme: r.extreme, high: r.high, moderate: r.moderate, low, terrible }
  }
  return out
}

// Build Spell Attack table = Spell DC - 10, clamped to >= 0.
function buildSpellAttackTable(dcTable: Record<number, TierMap>): Record<number, TierMap> {
  const out: Record<number, TierMap> = {}
  for (const L of LEVELS) {
    const r = dcTable[L]
    out[L] = {
      extreme:  clampSpellAtk(r.extreme - 10),
      high:     clampSpellAtk(r.high - 10),
      moderate: clampSpellAtk(r.moderate - 10),
      low:      clampSpellAtk(r.low - 10),
      terrible: clampSpellAtk(r.terrible - 10),
    }
  }
  return out
}

// Build Strike Damage table with extrapolated terrible. Formula reuses Low's die
// count; expected is extrapolated from low (clamped to 1). We keep low's formula
// verbatim for terrible so the die shape stays consistent at a glance.
function buildStrikeDamageTable(): Record<number, Record<Tier, DamageBenchmark>> {
  const out: Record<number, Record<Tier, DamageBenchmark>> = {}
  for (const L of LEVELS) {
    const r = STRIKE_DAMAGE_RAW[L]
    const terribleExpected = Math.max(1, r.low.expected - (r.moderate.expected - r.low.expected) - 1)
    out[L] = {
      extreme: r.extreme,
      high: r.high,
      moderate: r.moderate,
      low: r.low,
      // extrapolated: keep low's formula string; adjust expected only.
      terrible: { formula: r.low.formula, expected: terribleExpected },
    }
  }
  return out
}

// ── Exported materialised tables ──────────────────────────────────────────────

export const BENCHMARK_TABLES: {
  abilityMod: Record<number, Record<Tier, number>>
  perception: Record<number, Record<Tier, number>>
  skill: Record<number, Record<Tier, number>>
  ac: Record<number, Record<Tier, number>>
  save: Record<number, Record<Tier, number>>
  hp: Record<number, Record<Tier, number>>
  resistanceWeakness: Record<number, Record<Tier, number>>
  strikeAttack: Record<number, Record<Tier, number>>
  strikeDamage: Record<number, Record<Tier, DamageBenchmark>>
  spellDC: Record<number, Record<Tier, number>>
  spellAttack: Record<number, Record<Tier, number>>
  areaDamageUnlimited: Record<number, DamageBenchmark>
  areaDamageLimited: Record<number, DamageBenchmark>
} = initTables()

export const SAFE_ITEM_LEVEL_TABLE: Record<number, number> = { ...SAFE_ITEM_LEVEL_RAW }

function initTables(): typeof BENCHMARK_TABLES {
  const spellDC = buildSpellDcTable()
  const tables = {
    abilityMod: withTerribleFrom(ABILITY_MOD_RAW),
    perception: (() => {
      const out: Record<number, TierMap> = {}
      for (const L of LEVELS) out[L] = { ...PERCEPTION_RAW[L] }
      return out
    })(),
    skill: withTerribleFrom(SKILL_RAW),
    ac: withTerribleFrom(AC_RAW),
    save: (() => {
      const out: Record<number, TierMap> = {}
      for (const L of LEVELS) out[L] = { ...SAVE_RAW[L] }
      return out
    })(),
    hp: buildHpTable(),
    resistanceWeakness: buildResistanceTable(),
    strikeAttack: withTerribleFrom(STRIKE_ATTACK_RAW),
    strikeDamage: buildStrikeDamageTable(),
    spellDC,
    spellAttack: buildSpellAttackTable(spellDC),
    areaDamageUnlimited: { ...AREA_DAMAGE_UNLIMITED_RAW },
    areaDamageLimited: { ...AREA_DAMAGE_LIMITED_RAW },
  }

  // Pitfall 4: catch any NaN or missing level key at module load.
  const simpleKeys = [
    'abilityMod', 'perception', 'skill', 'ac', 'save', 'hp',
    'resistanceWeakness', 'strikeAttack', 'spellDC', 'spellAttack',
  ] as const
  const allTiers: Tier[] = ['extreme', 'high', 'moderate', 'low', 'terrible']
  for (const L of LEVELS) {
    for (const key of simpleKeys) {
      const row = (tables[key] as Record<number, TierMap>)[L]
      console.assert(row !== undefined, `BENCHMARK_TABLES.${key}[${L}] missing`)
      for (const t of allTiers) {
        console.assert(Number.isFinite(row[t]), `BENCHMARK_TABLES.${key}[${L}].${t} is NaN / non-finite`)
      }
    }
    for (const t of allTiers) {
      const dmg = tables.strikeDamage[L][t]
      console.assert(dmg !== undefined, `BENCHMARK_TABLES.strikeDamage[${L}].${t} missing`)
      console.assert(Number.isFinite(dmg.expected), `BENCHMARK_TABLES.strikeDamage[${L}].${t}.expected is NaN`)
      console.assert(typeof dmg.formula === 'string' && dmg.formula.length > 0, `BENCHMARK_TABLES.strikeDamage[${L}].${t}.formula empty`)
    }
    console.assert(tables.areaDamageUnlimited[L] !== undefined, `areaDamageUnlimited[${L}] missing`)
    console.assert(tables.areaDamageLimited[L] !== undefined, `areaDamageLimited[${L}] missing`)
    console.assert(Number.isFinite(SAFE_ITEM_LEVEL_RAW[L]), `SAFE_ITEM_LEVEL[${L}] missing`)
  }

  return tables
}
