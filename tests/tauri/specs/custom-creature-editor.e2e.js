const newCreatureButton = '//button[contains(normalize-space(.), "New Creature") or contains(normalize-space(.), "Новое существо")]'
const autoButton = '//button[normalize-space(.) = "Auto"]'
const abilityModsTab = '//button[contains(normalize-space(.), "Ability Mods") or contains(normalize-space(.), "Модификаторы")]'
const defenseTab = '//button[contains(normalize-space(.), "Defense") or contains(normalize-space(.), "Защита")]'
const saveButton = '//button[contains(normalize-space(.), "Save") or contains(normalize-space(.), "Сохранить")]'

async function clickVisible(selector) {
  const element = await $(selector)
  await element.waitForDisplayed({ timeout: 15000 })
  await element.click()
}

async function waitForValue(selector, expected) {
  await browser.waitUntil(
    async () => (await $(selector).getValue()) === expected,
    {
      timeout: 10000,
      timeoutMsg: `${selector} did not become ${expected}`,
    },
  )
}

async function waitForPreviewStat(labels, expectedText) {
  const labelPredicate = labels.map((label) => `normalize-space(.) = "${label}"`).join(' or ')
  const selector = `//p[${labelPredicate}]/following-sibling::*[1][contains(normalize-space(.), "${expectedText}")]`
  await $(selector).waitForDisplayed({
    timeout: 10000,
    timeoutMsg: `Preview stat ${labels.join('/')} did not show ${expectedText}`,
  })
}

async function waitForPath(hashPath) {
  await browser.waitUntil(
    async () => (await browser.execute(() => window.location.hash)) === hashPath,
    {
      timeout: 10000,
      timeoutMsg: `Route did not become ${hashPath}`,
    },
  )
}

describe('Custom creature editor', () => {
  it('auto mode updates linked stat fields while keeping manual fields editable', async () => {
    await browser.waitUntil(
      async () => (await browser.getTitle()) === 'PathMaid',
      { timeout: 20000 },
    )

    await browser.execute(() => {
      window.location.hash = '#/custom-creatures'
    })
    await waitForPath('#/custom-creatures')

    await clickVisible(newCreatureButton)

    await browser.waitUntil(
      async () => (await browser.execute(() => window.location.hash)).includes('/custom-creatures/')
        && (await browser.execute(() => window.location.hash)).includes('/edit'),
      { timeout: 20000 },
    )

    await $('#name').setValue(`WDIO Editor ${Date.now()}`)
    await clickVisible(autoButton)
    await clickVisible(abilityModsTab)
    await $('#abm-dex').setValue('4')

    await clickVisible(defenseTab)
    await waitForValue('#def-ac', '14')
    await waitForValue('#def-ref', '4')
    await waitForPreviewStat(['AC', 'КБ'], '14')
    await waitForPreviewStat(['Ref', 'Реакция'], '+4 (14)')

    await $('#def-ac').setValue('18')
    await waitForValue('#def-ac', '18')
    await waitForPreviewStat(['AC', 'КБ'], '18')

    await clickVisible(saveButton)
  })
})
