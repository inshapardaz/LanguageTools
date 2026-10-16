import { Card, Divider, Menu, Paper, Popover, Skeleton, Tabs, createTheme, type MantineThemeOverride } from '@mantine/core';
import { makeAccentPalette, DEFAULT_ACCENT, PLAIN_ACCENT } from './accent';

// The app offers three looks, picked in the theme menu and kept in local storage:
//   nawishta - the paper/spine design shared with the other Nawishta apps (warm paper, spine green,
//              gold); follows the light/dark/system choice
//   white    - a basic plain white theme (always light)
//   black    - a basic plain black theme (always dark)
// Surface colours are CSS custom properties per theme (styles/appearance.css); the Mantine theme
// supplies the accent palette, type and shape.

export const THEMES = ['nawishta', 'white', 'black'] as const;
export type ThemeName = (typeof THEMES)[number];
export const DEFAULT_THEME: ThemeName = 'nawishta';
export const THEME_KEY = 'uiTheme';

export const isThemeName = (value: unknown): value is ThemeName => THEMES.includes(value as ThemeName);

// Plain themes pin the colour scheme; Nawishta follows the visitor's choice.
export const forcedColorScheme = (theme: ThemeName): 'light' | 'dark' | undefined =>
  theme === 'white' ? 'light' : theme === 'black' ? 'dark' : undefined;

export function getStoredTheme(): ThemeName {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (isThemeName(stored)) return stored;
  } catch { /* ignore */ }
  return DEFAULT_THEME;
}

export function setStoredTheme(theme: ThemeName) {
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
}

const SPINE: MantineThemeOverride['colors'] = {
  spine: ['#eaf1ee', '#cfe0d9', '#a9c9bd', '#7fb09d', '#5a9882', '#3d7f69', '#2a6654', '#1f4a40', '#163831', '#0f2621'],
};

// `base` carries the app's font stack and any locale-specific type scale.
export const createAppTheme = (variant: ThemeName, base: MantineThemeOverride) => createTheme({
  ...base,
  primaryColor: 'accent',
  primaryShade: { light: 6, dark: 5 },
  colors: {
    ...SPINE,
    accent: makeAccentPalette(variant === 'nawishta' ? DEFAULT_ACCENT : PLAIN_ACCENT),
  },
  defaultRadius: 'sm',
  radius: { xs: '2px', sm: '4px', md: '8px', lg: '16px', xl: '32px' },
  components: {
    Card: Card.extend({
      defaultProps: { radius: 'md', withBorder: true },
      styles: { root: { backgroundColor: 'var(--paper-card)', borderColor: 'var(--nw-line)' } },
    }),
    Paper: Paper.extend({ styles: { root: { backgroundColor: 'var(--paper-card)', borderColor: 'var(--nw-line)' } } }),
    Tabs: Tabs.extend({ defaultProps: { color: 'accent' } }),
    Menu: Menu.extend({ styles: { dropdown: { backgroundColor: 'var(--paper-card)', borderColor: 'var(--nw-line)' } } }),
    Popover: Popover.extend({ styles: { dropdown: { backgroundColor: 'var(--paper-card)', borderColor: 'var(--nw-line)' } } }),
    Divider: Divider.extend({ styles: { root: { borderColor: 'var(--nw-line)' } } }),
    Skeleton: Skeleton.extend({ styles: { root: { '--skeleton-color': 'var(--paper-deep)' } } }),
  },
});
