import { describe, expect, it } from 'vitest';
import { DEFAULT_ACCENT, isValidAccent, makeAccentPalette } from './accent';
import { DEFAULT_THEME, THEMES, forcedColorScheme, getStoredTheme, isThemeName, setStoredTheme } from './index';

describe('makeAccentPalette', () => {
  it('returns ten shades with the accent itself at the primary shade (index 6)', () => {
    const palette = makeAccentPalette('#1c7ed6');
    expect(palette).toHaveLength(10);
    expect(palette[6]).toBe('#1c7ed6');
  });

  it('falls back to the default accent for invalid values', () => {
    expect(isValidAccent('blue')).toBe(false);
    expect(makeAccentPalette('blue')[6]).toBe(DEFAULT_ACCENT);
  });
});

describe('themes', () => {
  it('knows the three themes and rejects anything else', () => {
    expect(THEMES).toEqual(['nawishta', 'white', 'black']);
    expect(isThemeName('white')).toBe(true);
    expect(isThemeName('neon')).toBe(false);
  });

  it('pins the colour scheme only for the plain themes', () => {
    expect(forcedColorScheme('nawishta')).toBeUndefined();
    expect(forcedColorScheme('white')).toBe('light');
    expect(forcedColorScheme('black')).toBe('dark');
  });

  it('falls back to the default theme when storage is unavailable or holds junk', () => {
    expect(getStoredTheme()).toBe(DEFAULT_THEME);
    const store = new Map<string, string>();
    (globalThis as any).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    };
    store.set('uiTheme', 'neon');
    expect(getStoredTheme()).toBe(DEFAULT_THEME);
    setStoredTheme('black');
    expect(getStoredTheme()).toBe('black');
    delete (globalThis as any).localStorage;
  });
});
