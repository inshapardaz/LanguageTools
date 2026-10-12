import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('config', () => {
  beforeEach(() => {
    vi.resetModules();
    delete window.__ENV__;
  });

  afterEach(() => {
    delete window.__ENV__;
    vi.unstubAllEnvs();
  });

  it('uses runtime values from window.__ENV__', async () => {
    window.__ENV__ = {
      NODE_ENV: 'production',
      API_URL: 'https://api.example.com',
      MAIN_SITE: 'https://www.example.com',
    };
    vi.stubEnv('VITE_API_URL', 'http://build-time-api');

    const config = await import('./config');

    expect(config.NODE_ENV).toBe('production');
    expect(config.API_URL).toBe('https://api.example.com');
    expect(config.MAIN_SITE).toBe('https://www.example.com');
  });

  it('falls back to VITE_* build-time values when runtime values are missing or empty', async () => {
    window.__ENV__ = { API_URL: '' };
    vi.stubEnv('VITE_API_URL', 'http://build-time-api');
    vi.stubEnv('VITE_MAIN_SITE', 'http://build-time-site');

    const config = await import('./config');

    expect(config.API_URL).toBe('http://build-time-api');
    expect(config.MAIN_SITE).toBe('http://build-time-site');
  });

  it('falls back to localhost defaults when nothing is configured', async () => {
    const config = await import('./config');

    expect(config.NODE_ENV).toBe('local');
    expect(config.API_URL).toBe('http://localhost:4000');
    expect(config.MAIN_SITE).toBe('http://localhost:4200');
  });

  it('builds main-site account links that return to the current page', async () => {
    window.__ENV__ = { MAIN_SITE: 'https://www.example.com' };
    window.location.href = 'https://dictionary.example.com/spelling?x=1&y=2';

    const { accountUrl } = await import('./config');

    expect(accountUrl('/account/login')).toBe(
      'https://www.example.com/account/login?returnUrl=https%3A%2F%2Fdictionary.example.com%2Fspelling%3Fx%3D1%26y%3D2');
  });
});
