/**
 * Dictionary entry type used by DictionaryProvider.
 */
export interface DictEntry {
  word: string;
  roman?: string;
  urdu?: string;
  hindi?: string;
  meaning?: string;
}

/**
 * Provider interface for dictionary operations.
 * Passed to the editor to enable spell-check, autocomplete, and transliteration.
 */
export interface DictionaryProvider {
  /** Look up a word and return its dictionary entry, or null if not found. */
  lookup: (word: string) => Promise<DictEntry | null>;

  /** Search for words matching a prefix. Returns up to `limit` results. */
  search: (prefix: string, limit?: number) => Promise<string[]>;

  /** Get spelling suggestions for a word. */
  suggest: (word: string) => Promise<string[]>;

  /** Add a new word to the dictionary. */
  addWord: (entry: DictEntry) => Promise<void>;

  /** Convert text from one script to another. */
  convert: (text: string, from: string, to: string) => Promise<string>;
}

/**
 * Labels for editor UI elements (i18n support).
 */
export interface EditorLabels {
  // Toolbar
  undo: string;
  redo: string;
  bold: string;
  italic: string;
  underline: string;
  strikethrough: string;
  superscript: string;
  subscript: string;
  alignLeft: string;
  alignCenter: string;
  alignRight: string;
  alignJustify: string;
  heading1: string;
  heading2: string;
  heading3: string;
  heading4: string;
  heading5: string;
  heading6: string;
  paragraph: string;
  bulletList: string;
  numberedList: string;
  blockquote: string;
  codeBlock: string;
  insertLink: string;
  insertImage: string;
  font: string;
  zoom: string;

  // Text tools
  textCleanup: string;
  joinLines: string;
  removeSpaces: string;
  trimWhitespace: string;
  removeEmptyParagraphs: string;
  transliterate: string;

  // Status bar
  words: string;
  characters: string;
  script: string;
  spellCheck: string;

  // Dictionary
  addToDictionary: string;
  lookupWord: string;
  suggestions: string;
  ignore: string;
}

/**
 * Ref handle exposed by the Editor component for imperative access.
 */
export interface EditorRefHandle {
  /** Get the current editor state as serialized JSON string. */
  getEditorState: () => string;
}

/**
 * Props for the main Editor component.
 */
export interface EditorProps {
  /** Initial HTML content or serialized Lexical state. */
  initialContent?: string;

  /** Initial Lexical editor state as serialized JSON string (takes precedence over initialContent). */
  initialEditorState?: string;

  /** Font family applied to the entire editor document. */
  documentFont?: string;

  /** Document direction. */
  direction?: 'ltr' | 'rtl';

  /** Initial zoom level (1.0 = 100%). */
  zoom?: number;

  /** Enable spell-check plugin. */
  spellCheck?: boolean;

  /** Enable autocomplete plugin. */
  autocomplete?: boolean;

  /** Enable autocorrect plugin. */
  autocorrect?: boolean;

  /** Show the formatting toolbar. */
  showToolbar?: boolean;

  /** Show the status bar at the bottom. */
  showStatusBar?: boolean;

  /** Dictionary provider for spell-check, autocomplete, and transliteration. */
  dictionaryProvider?: DictionaryProvider;

  /** Called when the document content changes. Receives the HTML string. */
  onChange?: (html: string) => void;

  /** Called when the user triggers save (Ctrl+S). */
  onSave?: () => void;

  /** Ref for imperative access (getEditorState). */
  editorRef?: React.MutableRefObject<EditorRefHandle | null>;

  /** Partial label overrides for i18n. */
  labels?: Partial<EditorLabels>;
}
