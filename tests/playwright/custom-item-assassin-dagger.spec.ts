import type { Locator, Page } from '@playwright/test'
import { expect, test } from './tauri-app'

async function waitForHash(page: Page, hashPart: string): Promise<void> {
  await expect.poll(() => page.evaluate(() => window.location.hash)).toContain(hashPart)
}

async function fillInputByIndex(scope: Locator, index: number, value: string): Promise<void> {
  await scope.locator('input').nth(index).fill(value)
}

test('creates an assassin dagger custom item with internal rules', async ({ appPage }) => {
  const itemName = `Кинжал ассасина E2E ${Date.now()}`

  await expect(appPage.locator('body')).toBeVisible()
  await appPage.getByRole('link', { name: 'Custom Items' }).click()
  await waitForHash(appPage, '/custom-items')

  await appPage.getByRole('button', { name: /new/i }).click()
  await waitForHash(appPage, '/custom-items/')

  const fields = appPage.getByRole('tabpanel', { name: 'Fields' })
  await fillInputByIndex(fields, 0, itemName)
  await fillInputByIndex(fields, 1, '4')
  await fillInputByIndex(fields, 2, 'weapon')
  await fillInputByIndex(fields, 3, 'uncommon')
  await fillInputByIndex(fields, 5, 'L')
  await fillInputByIndex(fields, 6, 'held in 1 hand')
  await fillInputByIndex(fields, 8, 'magical agile finesse')
  await fillInputByIndex(fields, 9, '1d4')
  await fillInputByIndex(fields, 10, 'piercing')
  await fillInputByIndex(fields, 11, 'knife')
  await fields.locator('textarea').first().fill(
    'A narrow black dagger balanced for silent work. While carried, it sharpens the wielder into a patient killer.',
  )

  await appPage.getByRole('tab', { name: 'Rules' }).click()

  await appPage.getByRole('button', { name: /modifier/i }).click()
  await appPage.getByRole('button', { name: /ability$/i }).click()
  await appPage.getByRole('button', { name: /ability card/i }).click()

  const ruleCards = appPage.locator('.rounded-md.border.border-border\\/50')

  const modifier = ruleCards.filter({ hasText: 'flatModifier' })
  await modifier.locator('input').nth(0).fill('stealth')
  await modifier.locator('input').nth(1).fill('item')
  await modifier.locator('input').nth(2).fill('1')

  const ability = ruleCards.filter({ hasText: 'abilityModDelta' })
  await ability.locator('input').nth(0).fill('dex')
  await ability.locator('input').nth(1).fill('1')

  const grantedAbility = ruleCards.filter({ hasText: 'grantAbility' })
  await grantedAbility.locator('input').nth(0).fill('Sneak Attack')
  await grantedAbility.locator('input').nth(1).fill('')
  await grantedAbility.locator('textarea').fill('The bearer gains the rogue Sneak Attack ability.')

  await appPage.getByRole('button', { name: /save/i }).click()

  await expect(appPage.getByText('Custom item saved')).toBeVisible()
  await expect(appPage.getByRole('heading', { name: itemName, level: 1 })).toBeVisible()
  await expect(appPage.getByText('MAGICAL')).toBeVisible()
  await expect(appPage.getByText('AGILE')).toBeVisible()
  await expect(appPage.getByText('FINESSE')).toBeVisible()
})
