import { test, expect } from '@playwright/test';
import HomePage from '../pageObjects/homePage';

const TOOLS = ['Converter', 'Dictionary', 'Natural Dictionary', 'Spelling', 'Editor'];

// Runs against the Vite dev server with no API behind it, so it covers what renders without data.
test.describe('When user visits homepage', () => {
  test('has title', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();

    await expect(page).toHaveTitle(/Script Converter/);
  });

  test('shows every tool', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();

    for (const name of TOOLS) {
      await expect(homePage.tab(name)).toBeVisible();
    }
  });

  test('opens every tool without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const homePage = new HomePage(page);

    await homePage.goto();

    for (const name of TOOLS) {
      await homePage.tab(name).click();
      await expect(homePage.tab(name)).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('main')).not.toBeEmpty();
    }

    expect(errors).toEqual([]);
  });

  test('loads the editor', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();
    await homePage.tab('Editor').click();

    // likhari's canvas is a Lexical contenteditable, exposed as a textbox.
    await expect(page.locator('[contenteditable="true"]').first()).toBeVisible();
  });
});
