import { test } from '@playwright/test'

test('screenshot homepage', async ({ page }) => {
  await page.goto('http://localhost:5174')
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: 'e2e/screenshots/homepage.png', fullPage: true })
})
