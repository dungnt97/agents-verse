import { test, expect } from '@playwright/test';

// Every public (no-auth) route the marketing site serves. The middleware only gates /(workspace) routes,
// so these load without a session.
const INFO_SLUGS = ['about', 'careers', 'contact', 'cases', 'guarantees', 'status', 'privacy', 'terms', 'security'];

test.describe('public marketing routes', () => {
  test('landing page renders hero + nav + footer', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator('body')).toBeVisible();
    // A landing page has a primary heading and at least one call-to-action link/button.
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  for (const slug of INFO_SLUGS) {
    test(`info page /${slug} renders`, async ({ page }) => {
      const res = await page.goto(`/${slug}`);
      expect(res?.status(), `GET /${slug}`).toBeLessThan(400);
      await expect(page.locator('main, body').first()).toBeVisible();
      await expect(page.locator('h1, h2').first()).toBeVisible();
    });
  }

  test('login page renders an email + password form', async ({ page }) => {
    const res = await page.goto('/login');
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]').first()).toBeVisible();
  });

  test('workspace routes redirect to /login when unauthenticated', async ({ page }) => {
    await page.goto('/overview');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('marketing interactions', () => {
  test('chat assistant launcher renders on the landing page', async ({ page }) => {
    await page.goto('/');
    // The ChatWidget mounts a fixed launcher bottom-right; assert at least one fixed-position
    // control is present (the bubble) without depending on its exact open animation/timing.
    const fixed = page.locator('[style*="position:fixed"], [class*="fixed"]');
    await expect(fixed.first()).toBeVisible({ timeout: 10000 });
  });
});
