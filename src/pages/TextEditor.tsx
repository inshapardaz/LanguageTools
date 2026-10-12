import '@inshapardaz/likhari-react/styles.css';
import { useComputedColorScheme } from '@mantine/core';
import { EditorRoot, localStorageAutoCorrectStore, localStorageUserWordStore } from '@inshapardaz/likhari-react';
import { useI18n } from '../i18n';
import { apiAutoCorrectStore, apiCompletionStore, apiPunctuationStore, apiUserWordStore } from './editorStores';

// A scratch editor (likhari) for trying out the language tools: spell check against the spelling
// word lists, autocorrect and punctuation fixes from the correction lists, and completions. The
// browser's own stores sit beside the API ones so words and corrections added here work offline,
// and work in progress is kept as a browser draft.
const AUTO_CORRECT_STORES = [apiAutoCorrectStore(), apiPunctuationStore(), localStorageAutoCorrectStore()];
const DICTIONARY_STORES = [localStorageUserWordStore(), apiUserWordStore()];
const COMPLETION_STORES = [apiCompletionStore()];

const FEATURES = {
  language: {
    spellCheck: true,
    autocomplete: true,
    autocorrect: true,
    textCleanup: true,
  },
};

export default function TextEditor() {
  const { locale } = useI18n();
  const colorScheme = useComputedColorScheme('light');

  return (
    <EditorRoot
      documentId="languagetools-scratch"
      featurePreset="full"
      featureConfig={FEATURES}
      autoCorrectStores={AUTO_CORRECT_STORES}
      dictionaryStores={DICTIONARY_STORES}
      completionStores={COMPLETION_STORES}
      autoCompleteLanguage="auto"
      colorScheme={colorScheme}
      locale={locale}
      height="calc(100vh - 100px)"
      autosave
      restoreDraft="auto"
      navigationGuard="save-draft"
    />
  );
}
