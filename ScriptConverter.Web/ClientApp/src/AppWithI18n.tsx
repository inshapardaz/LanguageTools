import { useState, useMemo, useCallback } from 'react';
import { MantineProvider, DirectionProvider, createTheme, type MantineColorScheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { I18nContext, getStoredLocale, setStoredLocale, getTranslations, t as tFn, type Locale, type TranslationKeys } from './i18n';
import App from './App';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dropzone/styles.css';

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
const FONT_WITH_URDU = `'Urdu UI', ${SYSTEM_FONT}`;

// Theme for English/default (LTR)
const themeEn = createTheme({
  fontFamily: FONT_WITH_URDU,
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  headings: { fontFamily: FONT_WITH_URDU },
});

// Theme for Urdu (RTL) — same font stack, unicode-range handles the rest
const themeUr = createTheme({
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
});

export default function AppWithI18n() {
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale);
  const [colorScheme, setColorSchemeState] = useState<MantineColorScheme>(getStoredColorScheme);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setStoredLocale(newLocale);
  }, []);

  const setColorScheme = useCallback((scheme: MantineColorScheme) => {
    setColorSchemeState(scheme);
    setStoredColorScheme(scheme);
  }, []);

  const dir: 'ltr' | 'rtl' = locale === 'ur' ? 'rtl' : 'ltr';
  const theme = locale === 'ur' ? themeUr : themeEn;
  const tr = useMemo(() => getTranslations(locale), [locale]);
  const t = useCallback((key: TranslationKeys, ...args: (string | number)[]) => tFn(tr, key, ...args), [tr]);

  const i18nValue = useMemo(() => ({ locale, setLocale, tr, t, dir }), [locale, setLocale, tr, t, dir]);

  return (
    <I18nContext.Provider value={i18nValue}>
      <DirectionProvider initialDirection={dir} detectDirection={false}>
        <MantineProvider theme={theme} defaultColorScheme={colorScheme}>
          <Notifications position={dir === 'rtl' ? 'top-left' : 'top-right'} />
          <div dir={dir} style={{ fontFamily: FONT_WITH_URDU, height: '100%' }}>
            <App colorScheme={colorScheme} onColorSchemeChange={setColorScheme} />
          </div>
        </MantineProvider>
      </DirectionProvider>
    </I18nContext.Provider>
  );
}
