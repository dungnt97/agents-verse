import { test as setup, expect } from '@playwright/test';

const EMAIL = process.env.E2E_EMAIL || 'founder@agentsverse.ai';
const PASSWORD = process.env.E2E_PASSWORD || 'AgentsVerse!Demo2026';
const authFile = 'tests/e2e/.auth/founder.json';

setup('authenticate as founder', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"], input[name="password"]').first().fill(PASSWORD);
  await page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Đăng nhập"), button:has-text("Log in")').first().click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20000 });
  await page.context().storageState({ path: authFile });
});
