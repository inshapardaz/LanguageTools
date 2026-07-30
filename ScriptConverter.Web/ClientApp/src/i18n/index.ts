import { createContext, useContext } from 'react';
import en, { type TranslationKeys } from './en';
import ur from './ur';

export type Locale = 'en' | 'ur';

const translations: Record<Locale, Record<TranslationKeys, string>> = { en, ur };

const STORAGE_KEY = 'app-locale';

export function getStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'ur' || stored === 'en') return stored;
  } catch { /* ignore */ }
  return 'en';
}

export function setStoredLocale(locale: Locale) {
  try { localStorage.setItem(STORAGE_KEY, locale); } catch { /* ignore */ }
}

export function getTranslations(locale: Locale) {
  return translations[locale] || en;
}

/**
 * Simple string interpolation: replaces {0}, {1}, etc. with provided args.
 */
export function t(translations: Record<string, string>, key: TranslationKeys, ...args: (string | number)[]): string {
  let text = translations[key] || key;
  args.forEach((arg, i) => {
    text = text.replace(`{${i}}`, String(arg));
  });
  return text;
}

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  tr: Record<TranslationKeys, string>;
  t: (key: TranslationKeys, ...args: (string | number)[]) => string;
  dir: 'ltr' | 'rtl';
}

export const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  setLocale: () => {},
  tr: en,
  t: (key) => key,
  dir: 'ltr',
});

export function useI18n() {
  return useContext(I18nContext);
}

export { type TranslationKeys };
