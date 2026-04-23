/**
 * Debug harness for parseMonsterRuHtml — runs in Tauri WebView DevTools.
 *
 * Usage: open app in `pnpm tauri dev`, open DevTools (Ctrl+Shift+I),
 * run: `__pathmaid_parseMonsterDebug()`.
 *
 * This file is NOT a test suite (no Vitest/Jest). It's a manual smoke test
 * per Phase 84 CONTEXT.md D-06. Intentionally excluded from production bundle
 * by `import.meta.env.DEV` gate.
 */

import monsterJson from '../monster.json'
import { parseMonsterRuHtml } from './parse-monster'

// Minimal type for the monster fixture entries
interface MonsterFixture {
  name: string
  rus_name: string
  text?: string
  rus_text?: string
  level?: number
}

export async function runDebugTests(): Promise<void> {
  const monsters = monsterJson as MonsterFixture[]

  // Find Succubus fixture — scope: only entry currently in monster.json
  const succubus = monsters.find((m) => m.name === 'Succubus')
  if (!succubus) {
    console.error(
      '[parse-monster.debug] ERROR: Succubus fixture not found in monster.json. ' +
        'Cannot run assertions — check fixture data.',
    )
    return
  }

  let passed = 0
  let total = 0

  function assert(condition: boolean, message: string): void {
    total++
    if (condition) {
      passed++
    } else {
      console.assert(false, `[FAIL] ${message}`)
    }
  }

  // ---------------------------------------------------------------------------
  // Parse
  // ---------------------------------------------------------------------------
  const result = parseMonsterRuHtml(succubus.text, succubus.rus_text)

  // A1: Result is non-null
  assert(result !== null, 'Succubus: parse returned null')
  if (!result) {
    console.error('[parse-monster.debug] FAILED — null result, aborting assertions')
    return
  }

  // ---------------------------------------------------------------------------
  // abilitiesLoc
  // ---------------------------------------------------------------------------
  // A2: At least 5 abilities (Соблазнительное присутствие + Отвращение к отказу
  //     + Смена формы + Объятия + Страстный поцелуй + Нечистый дар = 6)
  assert(
    result.abilitiesLoc.length >= 5,
    `Succubus: expected >=5 abilities, got ${result.abilitiesLoc.length}`,
  )

  // A3: "Соблазнительное присутствие" exists
  assert(
    result.abilitiesLoc.some((a) =>
      a.name.toLowerCase().includes('соблазнительное'),
    ),
    'Succubus: missing "Соблазнительное присутствие" ability',
  )

  // A4: "Отвращение к отказу" exists
  assert(
    result.abilitiesLoc.some((a) => a.name.toLowerCase().includes('отвращение')),
    'Succubus: missing "Отвращение к отказу" ability',
  )

  // A5: "Смена формы" exists with actionCount=1
  const changeshape = result.abilitiesLoc.find((a) =>
    a.name.toLowerCase().includes('смена формы'),
  )
  assert(changeshape !== undefined, 'Succubus: missing "Смена формы" ability')
  assert(
    changeshape !== undefined && changeshape.actionCount === 1,
    `Succubus: "Смена формы" actionCount expected 1, got ${changeshape?.actionCount}`,
  )

  // A6: "Объятия" exists with actionCount=1
  const embrace = result.abilitiesLoc.find((a) =>
    a.name.toLowerCase().includes('объятия'),
  )
  assert(embrace !== undefined, 'Succubus: missing "Объятия" ability')
  assert(
    embrace !== undefined && embrace.actionCount === 1,
    `Succubus: "Объятия" actionCount expected 1, got ${embrace?.actionCount}`,
  )

  // A7: "Нечистый дар" exists with actionCount=3
  const profaneGift = result.abilitiesLoc.find((a) =>
    a.name.toLowerCase().includes('нечистый дар'),
  )
  assert(profaneGift !== undefined, 'Succubus: missing "Нечистый дар" ability')
  assert(
    profaneGift !== undefined && profaneGift.actionCount === 3,
    `Succubus: "Нечистый дар" actionCount expected 3, got ${profaneGift?.actionCount}`,
  )

  // A8: "Соблазнительное присутствие" has traits
  const seductive = result.abilitiesLoc.find((a) =>
    a.name.toLowerCase().includes('соблазнительное'),
  )
  assert(
    seductive !== undefined && seductive.traits.length >= 2,
    `Succubus: "Соблазнительное присутствие" expected >=2 traits, got ${seductive?.traits?.length}`,
  )

  // A9: "Страстный поцелуй" has description
  const kiss = result.abilitiesLoc.find((a) =>
    a.name.toLowerCase().includes('страстный'),
  )
  assert(kiss !== undefined, 'Succubus: missing "Страстный поцелуй" ability')
  assert(
    kiss !== undefined && kiss.description.length > 10,
    `Succubus: "Страстный поцелуй" description too short: "${kiss?.description}"`,
  )

  // ---------------------------------------------------------------------------
  // skillsLoc
  // ---------------------------------------------------------------------------
  // A10: 7 skills
  assert(
    result.skillsLoc.length === 7,
    `Succubus: expected 7 skills, got ${result.skillsLoc.length}`,
  )

  // A11: Acrobatics mapped
  assert(
    result.skillsLoc.some((s) => s.engineKey === 'Acrobatics'),
    'Succubus: Acrobatics skill not found',
  )

  // A12: All 7 engine keys mapped
  const expectedEngineKeys = [
    'Acrobatics',
    'Deception',
    'Diplomacy',
    'Intimidation',
    'Religion',
    'Society',
    'Stealth',
  ]
  for (const key of expectedEngineKeys) {
    assert(
      result.skillsLoc.some((s) => s.engineKey === key),
      `Succubus: missing skill engineKey=${key}`,
    )
  }

  // ---------------------------------------------------------------------------
  // speedsLoc
  // ---------------------------------------------------------------------------
  // A13: land speed
  assert(
    result.speedsLoc.land === '25 футов',
    `Succubus: land speed mismatch, got "${result.speedsLoc.land}"`,
  )

  // A14: fly speed
  assert(
    result.speedsLoc.fly === '35 футов',
    `Succubus: fly speed mismatch, got "${result.speedsLoc.fly}"`,
  )

  // A15: no climb/burrow/swim
  assert(
    result.speedsLoc.climb === undefined,
    'Succubus: climb speed should be undefined',
  )
  assert(
    result.speedsLoc.burrow === undefined,
    'Succubus: burrow speed should be undefined',
  )

  // ---------------------------------------------------------------------------
  // savesLoc
  // ---------------------------------------------------------------------------
  // A16: fort label
  assert(
    result.savesLoc.fortLabel === 'Стойкость',
    `Succubus: fort label expected "Стойкость", got "${result.savesLoc.fortLabel}"`,
  )

  // A17: ref label
  assert(
    result.savesLoc.refLabel === 'Реакция',
    `Succubus: ref label expected "Реакция", got "${result.savesLoc.refLabel}"`,
  )

  // A18: will label
  assert(
    result.savesLoc.willLabel === 'Воля',
    `Succubus: will label expected "Воля", got "${result.savesLoc.willLabel}"`,
  )

  // ---------------------------------------------------------------------------
  // acLoc / hpLoc
  // ---------------------------------------------------------------------------
  // A19: AC label
  assert(
    result.acLoc.label === 'КБ',
    `Succubus: AC label expected "КБ", got "${result.acLoc.label}"`,
  )

  // A20: HP label
  assert(
    result.hpLoc.label === 'ПЗ',
    `Succubus: HP label expected "ПЗ", got "${result.hpLoc.label}"`,
  )

  // ---------------------------------------------------------------------------
  // weaknessesLoc
  // ---------------------------------------------------------------------------
  // A21: 2 weaknesses
  assert(
    result.weaknessesLoc.length === 2,
    `Succubus: expected 2 weaknesses, got ${result.weaknessesLoc.length}`,
  )

  // A22: cold iron weakness present
  assert(
    result.weaknessesLoc.some((w) => w.toLowerCase().includes('холодное железо')),
    `Succubus: missing "холодное железо" weakness, got: ${JSON.stringify(result.weaknessesLoc)}`,
  )

  // ---------------------------------------------------------------------------
  // resistancesLoc / immunitiesLoc
  // ---------------------------------------------------------------------------
  // A23: no resistances (Succubus has none)
  assert(
    result.resistancesLoc.length === 0,
    `Succubus: expected 0 resistances, got ${result.resistancesLoc.length}`,
  )

  // A24: no immunities (Succubus has none)
  assert(
    result.immunitiesLoc.length === 0,
    `Succubus: expected 0 immunities, got ${result.immunitiesLoc.length}`,
  )

  // ---------------------------------------------------------------------------
  // perceptionLoc
  // ---------------------------------------------------------------------------
  // A25: perception label
  assert(
    result.perceptionLoc.label === 'Внимание',
    `Succubus: perception label expected "Внимание", got "${result.perceptionLoc.label}"`,
  )

  // A26: darkvision in senses
  assert(
    result.perceptionLoc.senses.toLowerCase().includes('ночное зрение'),
    `Succubus: "ночное зрение" not in senses: "${result.perceptionLoc.senses}"`,
  )

  // ---------------------------------------------------------------------------
  // languagesLoc
  // ---------------------------------------------------------------------------
  // A27: at least 4 languages
  assert(
    result.languagesLoc.length >= 4,
    `Succubus: expected >=4 languages, got ${result.languagesLoc.length}`,
  )

  // A28: common language present
  assert(
    result.languagesLoc.some((l) => l.toLowerCase().includes('всеобщий')),
    `Succubus: missing "всеобщий" language, got: ${JSON.stringify(result.languagesLoc)}`,
  )

  // ---------------------------------------------------------------------------
  // strikesLoc
  // ---------------------------------------------------------------------------
  // A29: at least 1 strike
  assert(
    result.strikesLoc.length >= 1,
    `Succubus: expected >=1 strike, got ${result.strikesLoc.length}`,
  )

  // A30: "когти" strike exists
  assert(
    result.strikesLoc.some((s) => s.name.toLowerCase().includes('когти')),
    `Succubus: missing "когти" strike, got: ${JSON.stringify(result.strikesLoc.map((s) => s.name))}`,
  )

  // A31: "режущий" damage type for когти
  const claws = result.strikesLoc.find((s) => s.name.toLowerCase().includes('когти'))
  assert(
    claws !== undefined && claws.damageType.toLowerCase().includes('режущий'),
    `Succubus: "когти" damageType expected "режущий", got "${claws?.damageType}"`,
  )

  // ---------------------------------------------------------------------------
  // spellcastingLoc
  // ---------------------------------------------------------------------------
  // A32: heading contains "заклинания"
  assert(
    result.spellcastingLoc.headingLabel.toLowerCase().includes('заклинания'),
    `Succubus: spellcasting heading missing "заклинания": "${result.spellcastingLoc.headingLabel}"`,
  )

  // A33: heading contains "сакральные" (Succubus is divine innate caster)
  assert(
    result.spellcastingLoc.headingLabel.toLowerCase().includes('сакральные'),
    `Succubus: spellcasting heading missing "сакральные": "${result.spellcastingLoc.headingLabel}"`,
  )

  // ---------------------------------------------------------------------------
  // Stretch tests — null/malformed/edge-case inputs
  // ---------------------------------------------------------------------------
  // S1: null inputs → null, no throw
  let stretchResult: ReturnType<typeof parseMonsterRuHtml> | undefined
  try {
    stretchResult = parseMonsterRuHtml(null, null)
    assert(stretchResult === null, 'Stretch S1: parseMonsterRuHtml(null, null) should return null')
  } catch (e) {
    assert(false, `Stretch S1: parseMonsterRuHtml(null, null) threw: ${String(e)}`)
  }

  // S2: malformed HTML → no throw
  try {
    stretchResult = parseMonsterRuHtml('', '<unclosed')
    // May return null or degraded object — but must NOT throw
    assert(true, 'Stretch S2: malformed HTML did not throw')
  } catch (e) {
    assert(false, `Stretch S2: parseMonsterRuHtml('', '<unclosed') threw: ${String(e)}`)
  }

  // S3: empty RU text → null
  try {
    stretchResult = parseMonsterRuHtml(succubus.text, '')
    assert(
      stretchResult === null,
      `Stretch S3: empty rusText should return null, got ${stretchResult}`,
    )
  } catch (e) {
    assert(false, `Stretch S3: threw on empty rusText: ${String(e)}`)
  }

  // S4: EN undefined, RU present → non-null result
  try {
    stretchResult = parseMonsterRuHtml(undefined, succubus.rus_text)
    assert(
      stretchResult !== null,
      'Stretch S4: undefined EN + valid RU should return non-null',
    )
  } catch (e) {
    assert(false, `Stretch S4: threw with undefined EN: ${String(e)}`)
  }

  // ---------------------------------------------------------------------------
  // Final report
  // ---------------------------------------------------------------------------
  if (passed === total) {
    console.log(
      `[parse-monster.debug] Succubus: ${passed}/${total} assertions passed`,
    )
  } else {
    console.error(
      `[parse-monster.debug] FAILED — ${passed}/${total} assertions passed (${total - passed} failed)`,
    )
  }
}

// Dev-mode: attach to window for DevTools invocation
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(
    window as unknown as {
      __pathmaid_parseMonsterDebug?: typeof runDebugTests
    }
  ).__pathmaid_parseMonsterDebug = runDebugTests
  console.log(
    '[parse-monster.debug] Available via window.__pathmaid_parseMonsterDebug()',
  )
}
