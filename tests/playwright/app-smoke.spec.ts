import { expect, test } from './tauri-app'

test('boots the native Tauri application', async ({ appPage }) => {
  await expect.poll(() => appPage.url()).not.toContain('localhost:5173')
  await expect(appPage).toHaveTitle('PathMaid')
  await expect(appPage.locator('body')).toBeVisible()
  await expect(appPage.getByText('Failed to initialize database')).toHaveCount(0)
})
