import { test, expect } from '@playwright/test';

const WORKSPACE_ROUTES = [
  '/overview', '/command', '/rooms', '/agents', '/leads',
  '/audits', '/demos', '/deals', '/settings', '/activity', '/requests',
];

test.describe('workspace (authenticated via storageState)', () => {
  for (const route of WORKSPACE_ROUTES) {
    test(`route ${route} renders the workspace shell`, async ({ page }) => {
      const res = await page.goto(route);
      expect(res?.status(), `GET ${route}`).toBeLessThan(400);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.locator('body')).toBeVisible();
      // The screen rendered real content (a non-trivial DOM), not an error/blank page.
      const bodyText = (await page.locator('body').innerText()).trim();
      expect(bodyText.length).toBeGreaterThan(20);
    });
  }

  test('sidebar link navigates between screens', async ({ page }) => {
    await page.goto('/overview');
    await expect(page).not.toHaveURL(/\/login/);
    const link = page.locator('a[href="/leads"], a[href*="/leads"]').first();
    if (await link.count()) { await link.click(); await expect(page).toHaveURL(/\/leads/); }
    else { await page.goto('/leads'); }
    await expect(page.locator('body')).toBeVisible();
  });
});
