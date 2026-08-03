import type { DictEntry, DictionaryProvider } from '../types';

interface ApiDictEntry {
  id: string;
  roman: string;
  urdu?: string;
  hindi?: string;
  meaning?: string;
  category?: string;
}

interface DictionarySearchResponse {
  total: number;
  entries: ApiDictEntry[];
}

interface ConvertResponse {
  result: string;
  from: string;
  to: string;
}

/**
 * Creates a DictionaryProvider that calls the /api/dictionary and /api/convert endpoints.
 */
export function createApiDictionaryProvider(): DictionaryProvider {
  const lookup = async (word: string): Promise<DictEntry | null> => {
    const res = await fetch(`/api/dictionary?q=${encodeURIComponent(word)}&limit=1`);
    if (!res.ok) return null;
    const data: DictionarySearchResponse = await res.json();
    const match = data.entries.find(
      (e) => e.roman.toLowerCase() === word.toLowerCase()
    );
    if (!match) return null;
    return {
      word: match.roman,
      roman: match.roman,
      urdu: match.urdu,
      hindi: match.hindi,
      meaning: match.meaning,
    };
  };

  const search = async (prefix: string, limit?: number): Promise<string[]> => {
    const l = limit ?? 8;
    const res = await fetch(
      `/api/dictionary?q=${encodeURIComponent(prefix)}&limit=${l}`
    );
    if (!res.ok) return [];
    const data: DictionarySearchResponse = await res.json();
    return data.entries.map((e) => e.roman);
  };

  const suggest = async (word: string): Promise<string[]> => {
    const res = await fetch(
      `/api/dictionary?q=${encodeURIComponent(word)}&limit=5`
    );
    if (!res.ok) return [];
    const data: DictionarySearchResponse = await res.json();
    return data.entries.map((e) => e.roman);
  };

  const addWord = async (entry: DictEntry): Promise<void> => {
    const body = {
      roman: entry.roman ?? entry.word,
      urdu: entry.urdu ?? '',
      hindi: entry.hindi ?? '',
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
