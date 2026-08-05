import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import type { NodeKey } from 'lexical';
import type { DictionaryProvider } from '../types';

// ─── Types ─────────────────────────────────────────────────────────────────────

/** Represents a misspelled word with its position in the editor. */
export interface MisspelledWord {
  word: string;
  nodeKey: NodeKey;
  offset: number;
  length: number;
}

export interface SpellCheckContextValue {
  /** List of all currently misspelled words in the document. */
  misspelledWords: MisspelledWord[];
  /** Update the list of misspelled words (called by SpellCheckPlugin). */
  setMisspelledWords: (words: MisspelledWord[]) => void;

  /** Session ignore list (lowercase words). */
  ignoredWords: Set<string>;
  /** Ignore a single word for this session. */
  ignoreWord: (word: string) => void;
  /** Ignore all instances of a word for this session. */
  ignoreAllWord: (word: string) => void;

  /** Word validity cache: lowercase word → boolean (true = valid). */
  wordCache: Map<string, boolean>;

  /** Whether the spell check panel is open. */
  isPanelOpen: boolean;
  /** Open the spell check panel. */
  openPanel: () => void;
  /** Close the spell check panel. */
  closePanel: () => void;

  /** Dictionary provider for lookups and suggestions. */
  dictionaryProvider: DictionaryProvider;

  /** Trigger a full re-check (e.g. after ignore/add to dict). */
  requestFullRecheck: () => void;
  /** Register the recheck handler (called by SpellCheckPlugin). */
  registerRecheckHandler: (handler: () => void) => void;

  /** Immediately remove all instances of a word from the misspelled list (for instant UI update). */
  removeWordFromList: (word: string) => void;
}

// ─── Context ───────────────────────────────────────────────────────────────────

const SpellCheckContext = createContext<SpellCheckContextValue | null>(null);

export function useSpellCheck(): SpellCheckContextValue {
  const ctx = useContext(SpellCheckContext);
  if (!ctx) {
    throw new Error('useSpellCheck must be used within a SpellCheckProvider');
  }
  return ctx;
}

// ─── Provider ──────────────────────────────────────────────────────────────────

interface SpellCheckProviderProps {
  dictionaryProvider: DictionaryProvider;
  children: ReactNode;
}

export function SpellCheckProvider({ dictionaryProvider, children }: SpellCheckProviderProps) {
  const [misspelledWords, setMisspelledWords] = useState<MisspelledWord[]>([]);
  const [ignoredWords, setIgnoredWords] = useState<Set<string>>(new Set());
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const wordCacheRef = useRef<Map<string, boolean>>(new Map());
  const recheckHandlerRef = useRef<(() => void) | null>(null);

  const ignoreWord = useCallback((word: string) => {
    const lower = word.toLowerCase();
    setIgnoredWords((prev) => {
      const next = new Set(prev);
      next.add(lower);
      return next;
    });
    // Mark as valid in cache
    wordCacheRef.current.set(lower, true);
  }, []);

  const ignoreAllWord = useCallback((word: string) => {
    // Same as ignoreWord — both ignore all instances for the session
    const lower = word.toLowerCase();
    setIgnoredWords((prev) => {
      const next = new Set(prev);
      next.add(lower);
      return next;
    });
    wordCacheRef.current.set(lower, true);
  }, []);

  const openPanel = useCallback(() => setIsPanelOpen(true), []);
  const closePanel = useCallback(() => setIsPanelOpen(false), []);

  const requestFullRecheck = useCallback(() => {
    recheckHandlerRef.current?.();
  }, []);

  const registerRecheckHandler = useCallback((handler: () => void) => {
    recheckHandlerRef.current = handler;
  }, []);

  const removeWordFromList = useCallback((word: string) => {
    const lower = word.toLowerCase();
    setMisspelledWords((prev) => prev.filter((w) => w.word.toLowerCase() !== lower));
  }, []);

  const value: SpellCheckContextValue = {
    misspelledWords,
    setMisspelledWords,
    ignoredWords,
    ignoreWord,
    ignoreAllWord,
    wordCache: wordCacheRef.current,
    isPanelOpen,
    openPanel,
    closePanel,
    dictionaryProvider,
    requestFullRecheck,
    registerRecheckHandler,
    removeWordFromList,
  };

  return (
    <SpellCheckContext.Provider value={value}>
      {children}
    </SpellCheckContext.Provider>
  );
}
