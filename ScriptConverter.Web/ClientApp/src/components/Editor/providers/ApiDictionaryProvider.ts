import type { DictEntry, DictionaryProvider } from '../types';

interface ConvertResponse {
  result: string;
  from: string;
  to: string;
}

interface SpellCheckResponse {
  found: boolean;
  word: string;
  meaning?: string | null;
  pronunciation?: string | null;
  suggestions?: Array<{ word: string; priority: number }> | null;
}

/**
 * Creates a DictionaryProvider that uses the backend /api/spellcheck endpoints
 * for word checking and suggestions, and /api/convert for transliteration.
 *
 * - lookup: Calls POST /api/spellcheck/check. Returns DictEntry if found, null if not.
 * - suggest: Calls POST /api/spellcheck/check and returns the suggestions array.
 * - addWord: Calls POST /api/dictionary to add the word.
 * - convert: Calls POST /api/convert for transliteration.
 *
 * When a suggestion is used (replace), the caller should also call trackReplacement.
 */
export function createApiDictionaryProvider(): DictionaryProvider {
  /**
   * Check a word via the unified spell check endpoint.
   */
  const spellCheckWord = async (word: string): Promise<SpellCheckResponse | null> => {
    try {
      const res = await fetch('/api/spellcheck/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  };

  const lookup = async (word: string): Promise<DictEntry | null> => {
    const result = await spellCheckWord(word);
    if (!result) return null;

    if (result.found) {
      return {
        word: result.word,
        meaning: result.meaning || undefined,
      };
    }

    // Word not found — return null (misspelled)
    return null;
  };

  const search = async (prefix: string, limit?: number): Promise<string[]> => {
    const result = await spellCheckWord(prefix);
    if (!result) return [];

    if (result.found) {
      return [result.word];
    }

    // Return suggestions as search results
    if (result.suggestions) {
      return result.suggestions.slice(0, limit ?? 8).map((s) => s.word);
    }

    return [];
  };

  const suggest = async (word: string): Promise<string[]> => {
    const result = await spellCheckWord(word);
    if (!result) return [];

    if (result.suggestions) {
      return result.suggestions.map((s) => s.word);
    }

    return [];
  };

  const addWord = async (entry: DictEntry): Promise<void> => {
    const word = entry.word;
    const isUrdu = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(word);
    const isHindi = /[\u0900-\u097F\u0980-\u09FF\uA8E0-\uA8FF]/.test(word);

    const body = {
      roman: (!isUrdu && !isHindi) ? word : (entry.roman ?? ''),
      urdu: isUrdu ? word : (entry.urdu ?? ''),
      hindi: isHindi ? word : (entry.hindi ?? ''),
      meaning: entry.meaning ?? '',
      category: '',
    };

    const res = await fetch('/api/dictionary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error || 'Failed to add word');
    }
  };

  const convert = async (
    text: string,
    from: string,
    to: string
  ): Promise<string> => {
    const res = await fetch('/api/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, from, to }),
    });
    if (!res.ok) {
      throw new Error('Conversion failed');
    }
    const data: ConvertResponse = await res.json();
    return data.result;
  };

  return { lookup, search, suggest, addWord, convert };
}

/**
 * Track a spell-check replacement on the backend.
 * Call this whenever the user accepts a suggestion to replace a misspelled word.
 */
export async function trackSpellCheckReplacement(sourceWord: string, replacement: string): Promise<void> {
  try {
    await fetch('/api/spellcheck/replace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceWord, replacement }),
    });
  } catch {
    // Non-critical — silently fail
  }
}

/**
 * Batch spell-check multiple words in a single request.
 * Returns a map of word → SpellCheckResult for each word.
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
    const res = await fetch('/api/spellcheck/check-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ words }),
    });
    if (!res.ok) return results;

    const data = await res.json();
    const items: SpellCheckBatchResult[] = data.results || [];

    for (const item of items) {
      results.set(item.word.toLowerCase(), item);
    }
  } catch {
    // Return empty map on failure
  }

  return results;
}
