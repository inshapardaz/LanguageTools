import { apiUrl, http, qs } from './http';

// Typed access to the API's language tools. Shapes are converted to what the pages already use, so
// the components keep working with `links` (word links), PascalCase link types and JSON-string
// alternates even though the API calls those `wordLinks`, camelCase and an array.

interface LinkView { rel: string; href: string; method: string }
interface WithLinks { links?: LinkView[] }

const hasLink = (view: WithLinks, rel: string) => !!view.links?.some((l) => l.rel === rel);

export interface PageView<T> extends WithLinks {
  pageSize: number;
  pageCount: number;
  currentPageIndex: number;
  totalCount: number;
  data: T[];
}

// ---- Scripts and languages ----------------------------------------------------------------------

export type Script = 'Roman' | 'UrduArabic' | 'HindiDevanagari';

const apiScript: Record<Script, string> = { Roman: 'roman', UrduArabic: 'urduArabic', HindiDevanagari: 'hindiDevanagari' };

// The language whose dictionary holds spellings in this script.
export const languageOfScript = (script: Script): string | null =>
  script === 'UrduArabic' ? 'ur' : script === 'HindiDevanagari' ? 'hi' : null;

// Spell-check language for a word, from its script (Latin words are checked as English).
export function languageOfWord(word: string): string {
  if (/[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/.test(word)) return 'ur';
  if (/[ऀ-ॿ]/.test(word)) return 'hi';
  return 'en';
}

// ---- Transliteration ----------------------------------------------------------------------------

export interface TransliteratedWord {
  input: string;
  output: string;
  source: 'dictionary' | 'rules' | 'punctuation';
  entryId?: number | null;
}

export interface TransliterationResult {
  result: string;
  words?: TransliteratedWord[] | null;
}

// Roman input uses the dictionary of the target script's language; other directions are rule-based,
// so any supported language works for them.
export function transliterate(text: string, from: Script, to: Script, details = false): Promise<TransliterationResult> {
  const language = languageOfScript(to) ?? languageOfScript(from) ?? 'ur';
  return http.post(`/tools/${language}/transliterate`, { text, from: apiScript[from], to: apiScript[to], details });
}

export interface TransliterationEntry {
  id: number;
  language: string;
  roman: string;
  native: string;
  meaning?: string | null;
  category?: string | null;
  canEdit: boolean;
}

type TransliterationEntryView = Omit<TransliterationEntry, 'canEdit'> & WithLinks;
const toEntry = (v: TransliterationEntryView): TransliterationEntry => ({ ...v, canEdit: hasLink(v, 'update') });

export async function getTransliterationEntries(language: string, query: string, pageNumber = 1, pageSize = 100) {
  const page = await http.get<PageView<TransliterationEntryView>>(`/tools/${language}/transliteration/entries${qs({ query, pageNumber, pageSize })}`);
  return { ...page, data: page.data.map(toEntry), canCreate: hasLink(page, 'create') };
}

export const getTransliterationEntry = async (language: string, id: number) =>
  toEntry(await http.get<TransliterationEntryView>(`/tools/${language}/transliteration/entries/${id}`));

type EntryInput = Pick<TransliterationEntry, 'roman' | 'native' | 'meaning' | 'category'>;

export const addTransliterationEntry = async (language: string, entry: EntryInput) =>
  toEntry(await http.post<TransliterationEntryView>(`/tools/${language}/transliteration/entries`, entry));

export const updateTransliterationEntry = async (language: string, id: number, entry: EntryInput) =>
  toEntry(await http.put<TransliterationEntryView>(`/tools/${language}/transliteration/entries/${id}`, entry));

export const deleteTransliterationEntry = (language: string, id: number) =>
  http.delete(`/tools/${language}/transliteration/entries/${id}`);

// ---- Spelling -----------------------------------------------------------------------------------

export interface SpellCheckResult {
  word: string;
  found: boolean;
  suggestions: { word: string; priority: number }[];
}

// Checks words in batches of the API's limit, grouped by the language of their script.
export async function checkSpelling(words: string[]): Promise<SpellCheckResult[]> {
  const byLanguage = new Map<string, string[]>();
  for (const word of new Set(words)) {
    const language = languageOfWord(word);
    byLanguage.set(language, [...(byLanguage.get(language) ?? []), word]);
  }

  const results: SpellCheckResult[] = [];
  for (const [language, list] of byLanguage) {
    for (let i = 0; i < list.length; i += 2000) {
      results.push(...await http.post<SpellCheckResult[]>(`/tools/${language}/spellchecker/check`, { words: list.slice(i, i + 2000) }));
    }
  }
  return results;
}

export const recordSpellingReplacement = (word: string, replacement: string) =>
  http.post(`/tools/${languageOfWord(word)}/spellchecker/replace`, { word, replacement });

export interface SpellingWord { id: number; word: string; language: string; canEdit: boolean; canDelete: boolean }
type SpellingWordView = Omit<SpellingWord, 'canEdit' | 'canDelete'> & WithLinks;
const toWord = (v: SpellingWordView): SpellingWord => ({ ...v, canEdit: hasLink(v, 'update'), canDelete: hasLink(v, 'delete') });

export async function getSpellingWords(language: string, query: string, pageNumber = 1, pageSize = 50) {
  const page = await http.get<PageView<SpellingWordView>>(`/tools/${language}/words${qs({ query, pageNumber, pageSize })}`);
  return { ...page, data: page.data.map(toWord), canCreate: hasLink(page, 'create') };
}

export const addSpellingWord = async (language: string, word: string) =>
  toWord(await http.post<SpellingWordView>(`/tools/${language}/words`, { word }));

export const updateSpellingWord = async (language: string, id: number, word: string) =>
  toWord(await http.put<SpellingWordView>(`/tools/${language}/words/${id}`, { word }));

export const deleteSpellingWord = (language: string, id: number) => http.delete(`/tools/${language}/words/${id}`);

export interface ImportResult { added: number; updated?: number; skipped: number }

export function uploadSpellingWords(language: string, file: File): Promise<ImportResult> {
  const form = new FormData();
  form.append('file', file);
  return http.post(`/tools/${language}/words/upload`, form);
}

export const spellingWordsExportUrl = (language: string) => apiUrl(`/tools/${language}/words/export`);

// ---- Meaning dictionaries -----------------------------------------------------------------------

export interface DictionaryInfo {
  id: number;
  name: string;
  description?: string | null;
  format: string;
  entryCount: number;
  sourceLanguage?: string | null;
  targetLanguage?: string | null;
  dateCreated: string;
  canEdit: boolean;
}

type DictionaryView = Omit<DictionaryInfo, 'canEdit'> & WithLinks;
const toDictionary = (v: DictionaryView): DictionaryInfo => ({ ...v, canEdit: hasLink(v, 'update') });

export async function getDictionaries(query = '', pageNumber = 1, pageSize = 100) {
  const page = await http.get<PageView<DictionaryView>>(`/dictionaries${qs({ query, pageNumber, pageSize })}`);
  return { ...page, data: page.data.map(toDictionary), canCreate: hasLink(page, 'create') };
}

export const getDictionary = async (id: number | string) => toDictionary(await http.get<DictionaryView>(`/dictionaries/${id}`));

export async function uploadDictionary(file: File): Promise<DictionaryInfo> {
  const form = new FormData();
  form.append('file', file);
  return toDictionary(await http.post<DictionaryView>('/dictionaries/upload', form));
}

export const deleteDictionary = (id: number | string) => http.delete(`/dictionaries/${id}`);

export const dictionaryExportUrl = (id: number | string, format: 'starDict' | 'dsl' | 'json' | 'kobo' | 'kindle') =>
  apiUrl(`/dictionaries/${id}/export?format=${format}`);

// Optional fields are left out (not null) when empty: the API omits nulls, and the article view
// components expect `undefined`.
export interface WordLink { linkType: string; targetWord: string; note?: string }

export interface Article {
  id: number;
  dictionaryId: number;
  dictionaryName?: string;
  headword: string;
  pronunciation?: string;
  senses: { partOfSpeech?: string; grammar?: string; meanings: { definition: string; examples: string[]; label?: string }[] }[];
  links: WordLink[];
  rawDefinition?: string;
  alternates?: string;
  canEdit: boolean;
}

interface ArticleView extends WithLinks {
  id: number;
  dictionaryId: number;
  dictionaryName?: string;
  headword: string;
  pronunciation?: string;
  senses?: Article['senses'];
  wordLinks?: WordLink[];
  rawDefinition?: string;
  alternates?: string[];
}

const pascal = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const camel = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);

const toArticle = (v: ArticleView): Article => ({
  id: v.id,
  dictionaryId: v.dictionaryId,
  dictionaryName: v.dictionaryName,
  headword: v.headword,
  pronunciation: v.pronunciation,
  senses: v.senses ?? [],
  links: (v.wordLinks ?? []).map((l) => ({ ...l, linkType: pascal(l.linkType) })),
  rawDefinition: v.rawDefinition,
  alternates: v.alternates?.length ? JSON.stringify(v.alternates) : undefined,
  canEdit: hasLink(v, 'update'),
});

export interface ArticleInput {
  headword: string;
  pronunciation?: string | null;
  senses: Article['senses'];
  links: WordLink[];
  rawDefinition?: string | null;
  alternates?: string | null;
}

const fromArticle = (a: ArticleInput) => ({
  headword: a.headword,
  pronunciation: a.pronunciation,
  senses: a.senses,
  wordLinks: a.links.map((l) => ({ ...l, linkType: camel(l.linkType) })),
  rawDefinition: a.rawDefinition,
  alternates: a.alternates ? (JSON.parse(a.alternates) as string[]) : null,
});

export async function getArticles(dictionaryId: number | string, query: string, pageNumber: number, pageSize: number) {
  const page = await http.get<PageView<ArticleView>>(`/dictionaries/${dictionaryId}/articles${qs({ query, pageNumber, pageSize })}`);
  return { ...page, data: page.data.map(toArticle), canCreate: hasLink(page, 'create') };
}

export const addArticle = async (dictionaryId: number | string, article: ArticleInput) =>
  toArticle(await http.post<ArticleView>(`/dictionaries/${dictionaryId}/articles`, fromArticle(article)));

export const updateArticle = async (dictionaryId: number | string, articleId: number, article: ArticleInput) =>
  toArticle(await http.put<ArticleView>(`/dictionaries/${dictionaryId}/articles/${articleId}`, fromArticle(article)));

export const deleteArticle = (dictionaryId: number | string, articleId: number) =>
  http.delete(`/dictionaries/${dictionaryId}/articles/${articleId}`);

export const lookupWord = async (word: string, dictionaryIds?: number[]) =>
  (await http.get<ArticleView[]>(`/dictionaries/lookup${qs({ word, dictionaryIds: dictionaryIds?.join(',') })}`)).map(toArticle);

export const suggestHeadwords = async (prefix: string, limit = 8) =>
  (await http.get<{ suggestions: string[] }>(`/dictionaries/suggest${qs({ prefix, limit })}`)).suggestions;

export interface MergeGroup { baseHeadword: string; articles: Article[] }

export const getMergeCandidates = async (dictionaryId: number | string, limit = 200): Promise<MergeGroup[]> =>
  (await http.get<{ baseHeadword: string; articles: ArticleView[] }[]>(`/dictionaries/${dictionaryId}/merge-candidates?limit=${limit}`))
    .map((g) => ({ baseHeadword: g.baseHeadword, articles: g.articles.map(toArticle) }));

export const mergeArticles = async (dictionaryId: number | string, articleIds: number[], headword: string) =>
  toArticle(await http.post<ArticleView>(`/dictionaries/${dictionaryId}/merge`, { articleIds, headword }));

// ---- Account ------------------------------------------------------------------------------------

export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  isSuperAdmin: boolean;
  isDictionaryWriter: boolean;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    return await http.get<CurrentUser>('/accounts/user');
  } catch {
    return null;
  }
}

export const logout = () => http.post('/accounts/revoke-token', {});
