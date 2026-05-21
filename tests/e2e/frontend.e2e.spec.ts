import { expect, test } from '@playwright/test'

test.describe('Frontend', () => {
  test('redirects homepage to the AI workbench', async ({ page }) => {
    await page.goto('http://localhost:3000')

    await expect(page).toHaveURL(/\/ai/)
    await expect(page.locator('h1', { hasText: 'AI workspace for content testing' })).toBeVisible()
  })
})
