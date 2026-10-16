import { useState, useMemo, useCallback, useEffect } from 'react';
import { MantineProvider, DirectionProvider, type MantineColorScheme, type MantineThemeOverride } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { I18nContext, getStoredLocale, setStoredLocale, getTranslations, t as tFn, type Locale, type TranslationKeys } from './i18n';
import App from './App';
import { AuthProvider } from './auth';
import { createAppTheme, forcedColorScheme, getStoredTheme, setStoredTheme, type ThemeName } from './theme';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dropzone/styles.css';
import './styles/appearance.css';

const COLOR_SCHEME_KEY = 'app-color-scheme';

function getStoredColorScheme(): MantineColorScheme {
  try {
    const stored = localStorage.getItem(COLOR_SCHEME_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored;
  } catch { /* ignore */ }
  return 'auto';
}

function setStoredColorScheme(scheme: MantineColorScheme) {
  try { localStorage.setItem(COLOR_SCHEME_KEY, scheme); } catch { /* ignore */ }
}

const SYSTEM_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
// 'Urdu UI' is defined with unicode-range in index.html — it only activates for Arabic/Urdu codepoints
const FONT_WITH_URDU = `'Urdu UI', 'Open Sans Variable', 'Open Sans', ${SYSTEM_FONT}`;

// Theme for English/default (LTR)
const baseEn: MantineThemeOverride = {
  fontFamily: FONT_WITH_URDU,
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  headings: { fontFamily: FONT_WITH_URDU },
};

// Theme for Urdu (RTL) — same font stack, unicode-range handles the rest
const baseUr: MantineThemeOverride = {
  fontFamily: FONT_WITH_URDU,
  fontFamilyMonospace: `'Urdu UI', ui-monospace, monospace`,
  headings: { fontFamily: FONT_WITH_URDU },
  fontSizes: {
    xs: '0.8rem',
    sm: '0.95rem',
    md: '1.05rem',
    lg: '1.15rem',
    xl: '1.3rem',
  },
  lineHeights: {
    xs: '1.6',
    sm: '1.7',
    md: '1.8',
    lg: '1.9',
    xl: '2.0',
  },
};

export default function AppWithI18n() {
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale);
  const [themeName, setThemeNameState] = useState<ThemeName>(getStoredTheme);
  const [colorScheme, setColorSchemeState] = useState<MantineColorScheme>(getStoredColorScheme);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setStoredLocale(newLocale);
  }, []);

  const setColorScheme = useCallback((scheme: MantineColorScheme) => {
    setColorSchemeState(scheme);
    setStoredColorScheme(scheme);
  }, []);

  const setThemeName = useCallback((name: ThemeName) => {
    setThemeNameState(name);
    setStoredTheme(name);
  }, []);

  // The palette (see styles/appearance.css) is an attribute on <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-nw-theme', themeName);
  }, [themeName]);

  const dir: 'ltr' | 'rtl' = locale === 'ur' ? 'rtl' : 'ltr';
  const theme = useMemo(() => createAppTheme(themeName, locale === 'ur' ? baseUr : baseEn), [themeName, locale]);
  const tr = useMemo(() => getTranslations(locale), [locale]);
  const t = useCallback((key: TranslationKeys, ...args: (string | number)[]) => tFn(tr, key, ...args), [tr]);

  const i18nValue = useMemo(() => ({ locale, setLocale, tr, t, dir }), [locale, setLocale, tr, t, dir]);

  return (
    <I18nContext.Provider value={i18nValue}>
      <DirectionProvider initialDirection={dir} detectDirection={false}>
        <MantineProvider theme={theme} defaultColorScheme={colorScheme} forceColorScheme={forcedColorScheme(themeName)}>
          <Notifications position={dir === 'rtl' ? 'top-left' : 'top-right'} />
          <div dir={dir} style={{ fontFamily: FONT_WITH_URDU, height: '100%' }}>
            <AuthProvider>
              <App colorScheme={colorScheme} onColorSchemeChange={setColorScheme} theme={themeName} onThemeChange={setThemeName} />
            </AuthProvider>
          </div>
        </MantineProvider>
      </DirectionProvider>
    </I18nContext.Provider>
  );
}
