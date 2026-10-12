import type { AutoCorrectStore, CompletionStore, UserWordStore } from '@inshapardaz/likhari-react';
import { ApiError, http } from '../api/http';
import { addSpellingWord } from '../api/languageTools';

// Adapters from likhari-react's store interfaces to the API's language tools, the same sources
// library-editor's editor uses: the autocorrect and punctuation lists, and the spelling word list
// (as the user dictionary and for completions).

type EditorLanguage = Parameters<AutoCorrectStore['load']>[0];

// likhari's language ids to the API's language codes.
const apiLanguage = (language: EditorLanguage) => (language === 'pa-shahmukhi' ? 'pa' : language);

interface Correction { incorrectText: string; correctText: string }

const correctionStore = (profile: 'autocorrect' | 'punctuation'): AutoCorrectStore => ({
  id: `api-${profile}`,
  // Editors add corrections on the Corrections pages, not from inside the editor.
  readOnly: true,
  async load(language) {
    const list = await http.get<Correction[]>(`/tools/${apiLanguage(language)}/spellchecker/${profile}`);
    return (list ?? []).map((c) => ({ from: c.incorrectText, to: c.correctText }));
  },
});

// The API answers 404 for a language that has no words yet.
async function loadWords(language: EditorLanguage): Promise<string[]> {
  try {
    return (await http.get<string[]>(`/tools/${apiLanguage(language)}/words/list`)) ?? [];
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return [];
    throw e;
  }
}

export const apiAutoCorrectStore = () => correctionStore('autocorrect');
export const apiPunctuationStore = () => correctionStore('punctuation');

export const apiUserWordStore = (): UserWordStore => ({
  id: 'api-words',
  load: loadWords,
  async append(language, word) {
    await addSpellingWord(apiLanguage(language), word);
  },
});

export const apiCompletionStore = (): CompletionStore => ({
  id: 'api-words',
  load: loadWords,
});
