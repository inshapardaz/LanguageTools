import { test, expect } from '@playwright/test';

// Local defaults of the links to the other Nawishta apps (see src/config.ts)
test.describe('Links to the other apps', () => {
  test('the logo goes to the main site home page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Nawishta home' })).toHaveAttribute('href', 'http://localhost:4200');
  });

  test('the app switcher lists the other apps', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Nawishta apps' }).click();
    await expect(page.getByRole('menuitem', { name: 'Libraries', exact: true })).toHaveAttribute('href', 'http://localhost:4400');
    await expect(page.getByRole('menuitem', { name: 'Library editor' })).toHaveAttribute('href', 'http://localhost:4300');
    await expect(page.getByRole('menuitem', { name: 'Dictionary and tools' })).toHaveAttribute('aria-current', 'true');
  });
});
