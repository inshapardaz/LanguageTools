import type { DictEntry, DictionaryProvider } from '../types';
import {
  addSpellingWord, checkSpelling, languageOfWord, lookupWord, recordSpellingReplacement, transliterate,
  type Script, type SpellCheckResult,
} from '../../../api/languageTools';

/**
 * A DictionaryProvider backed by the API's language tools:
 *
 * - lookup: spell-checks the word in the language of its script; when it is spelt correctly, the
 *   meaning comes from the first matching article in the meaning dictionaries.
 * - search / suggest: spell-check suggestions (replacements writers chose before come first).
 * - addWord: adds the word to the spelling dictionary of its language.
 * - convert: transliteration between Roman, Urdu and Hindi script.
 *
 * When a suggestion is used (replace), the caller should also call trackSpellCheckReplacement.
 */
export function createApiDictionaryProvider(): DictionaryProvider {
  const spellCheckWord = async (word: string): Promise<SpellCheckResult | null> => {
    try {
      return (await checkSpelling([word]))[0] ?? null;
    } catch {
      return null;
    }
  };

  const meaningOf = async (word: string): Promise<string | undefined> => {
    try {
      const [article] = await lookupWord(word);
      const definitions = article?.senses.flatMap((s) => s.meanings.map((m) => m.definition)).filter(Boolean).slice(0, 3);
      return definitions?.length ? definitions.join('; ') : article?.rawDefinition ?? undefined;
    } catch {
      return undefined;
    }
  };

  const lookup = async (word: string): Promise<DictEntry | null> => {
    const result = await spellCheckWord(word);
    if (!result?.found) return null;
    return { word: result.word, meaning: await meaningOf(result.word) };
  };

  const search = async (prefix: string, limit?: number): Promise<string[]> => {
    const result = await spellCheckWord(prefix);
    if (!result) return [];
    if (result.found) return [result.word];
    return result.suggestions.slice(0, limit ?? 8).map((s) => s.word);
  };

  const suggest = async (word: string): Promise<string[]> => {
    const result = await spellCheckWord(word);
    return result?.suggestions.map((s) => s.word) ?? [];
  };

  const addWord = async (entry: DictEntry): Promise<void> => {
    await addSpellingWord(languageOfWord(entry.word), entry.word);
  };

  const convert = async (text: string, from: string, to: string): Promise<string> =>
    (await transliterate(text, from as Script, to as Script)).result;

  return { lookup, search, suggest, addWord, convert };
}

/**
 * Track a spell-check replacement on the backend, so it ranks higher next time.
 * Call this whenever the user accepts a suggestion to replace a misspelled word.
 */
export async function trackSpellCheckReplacement(sourceWord: string, replacement: string): Promise<void> {
  try {
    await recordSpellingReplacement(sourceWord, replacement);
  } catch {
    // Non-critical (and only editors may record) — silently fail
  }
}

/**
 * Batch spell-check multiple words.
 * Returns a map of lower-cased word → result for each word.
 */
export interface SpellCheckBatchResult {
  found: boolean;
  word: string;
  meaning?: string | null;
  pronunciation?: string | null;
  suggestions?: Array<{ word: string; priority: number }> | null;
}

export async function batchSpellCheck(words: string[]): Promise<Map<string, SpellCheckBatchResult>> {
  const results = new Map<string, SpellCheckBatchResult>();
  if (words.length === 0) return results;

  try {
    for (const item of await checkSpelling(words)) {
      results.set(item.word.toLowerCase(), item);
    }
  } catch {
    // Return empty map on failure
  }

  return results;
}
