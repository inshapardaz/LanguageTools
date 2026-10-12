import { describe, expect, it } from 'vitest';
import { qs } from './http';
import { languageOfScript, languageOfWord } from './languageTools';

describe('languageOfWord', () => {
  it.each([
    ['کتاب', 'ur'],
    ['كتاب', 'ur'],
    ['किताब', 'hi'],
    ['book', 'en'],
    ['123', 'en'],
  ])('checks %s as %s', (word, language) => {
    expect(languageOfWord(word)).toBe(language);
  });
});

describe('languageOfScript', () => {
  it('maps native scripts to the language whose dictionary holds them', () => {
    expect(languageOfScript('UrduArabic')).toBe('ur');
    expect(languageOfScript('HindiDevanagari')).toBe('hi');
    expect(languageOfScript('Roman')).toBeNull();
  });
});

describe('qs', () => {
  it('encodes defined, non-empty values only', () => {
    expect(qs({ query: 'a b', pageNumber: 2, empty: '', missing: undefined, none: null })).toBe('?query=a%20b&pageNumber=2');
  });

  it('is empty when there is nothing to send', () => {
    expect(qs({ query: '' })).toBe('');
  });
});
