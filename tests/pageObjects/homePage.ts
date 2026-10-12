import type { Page } from '@playwright/test';

export default class HomePage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/');
  }

  tab(name: string) {
    return this.page.getByRole('tab', { name, exact: true });
  }
}
