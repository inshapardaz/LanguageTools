import { useCallback, useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $isTextNode, TextNode } from 'lexical';
import type { NodeKey } from 'lexical';

import { useSpellCheck, type MisspelledWord } from './SpellCheckContext';
import { batchSpellCheck } from '../providers/ApiDictionaryProvider';

/** Base debounce delay in milliseconds. */
const BASE_DEBOUNCE_MS = 500;

/** Maximum debounce delay in milliseconds. */
const MAX_DEBOUNCE_MS = 2000;

/** Number of nodes to process per idle frame to avoid jank. */
const NODES_PER_FRAME = 10;

/** Initial startup delay before first spell check (seconds). */
const INITIAL_DELAY_MS = 3000;

/**
 * Calculate an adaptive debounce delay based on total word count.
 */
function getAdaptiveDelay(wordCount: number): number {
  const extra = Math.min(Math.floor(wordCount / 100), MAX_DEBOUNCE_MS - BASE_DEBOUNCE_MS);
  return BASE_DEBOUNCE_MS + extra;
}

/**
 * SpellCheckPlugin — Debounced word checking with red wavy underline decorations.
 *
 * Uses the shared SpellCheckContext for ignore list, word cache, and misspelled word state.
 * Applies red wavy underline via inline style on split TextNodes.
 *
 * Performance optimizations:
 * - Incremental checking: only re-checks text nodes that changed (dirty leaves)
 * - Persistent word cache from context
 * - Batched dictionary lookups using Promise.all with chunking
 * - Adaptive debounce: delay increases for larger documents
 */
export default function SpellCheckPlugin() {
  const [editor] = useLexicalComposerContext();
  const {
    setMisspelledWords,
    ignoredWords,
    wordCache,
    registerRecheckHandler,
  } = useSpellCheck();

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCheckingRef = useRef(false);

  /**
   * Tracks which node keys had misspelled words on the last run.
   */
  const misspelledByNodeRef = useRef<Map<NodeKey, MisspelledWord[]>>(new Map());

  /**
   * Track dirty node keys. null means "full check required".
   */
  const pendingDirtyLeavesRef = useRef<Set<NodeKey> | null>(null);

  /**
   * Extract words from text, returning each with its offset.
   */
  const extractWords = useCallback(
    (text: string): Array<{ word: string; offset: number }> => {
      const words: Array<{ word: string; offset: number }> = [];
      const regex = /[\p{L}\p{M}]+/gu;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        words.push({ word: match[0], offset: match.index });
      }
      return words;
    },
    [],
  );

  /**
   * Get approximate word count for adaptive debounce.
   */
  const getDocumentWordCount = useCallback((): number => {
    let count = 0;
    editor.getEditorState().read(() => {
      const root = $getRoot();
      const textNodes = root.getAllTextNodes();
      for (const node of textNodes) {
        count += node.getTextContent().split(/\s+/).filter(Boolean).length;
      }
    });
    return count;
  }, [editor]);

  /**
   * Check words against dictionary using the batch API endpoint.
   */
  const batchCheckWords = useCallback(
    async (words: string[]): Promise<Map<string, boolean>> => {
      const results = new Map<string, boolean>();

      // Check cache first
      const uncached: string[] = [];
      for (const word of words) {
        const lower = word.toLowerCase();
        if (wordCache.has(lower)) {
          results.set(lower, wordCache.get(lower)!);
        } else if (!uncached.includes(lower)) {
          uncached.push(lower);
        }
      }

      if (uncached.length === 0) return results;

      // Use the batch endpoint for all uncached words at once
      const batchResults = await batchSpellCheck(uncached);

      for (const [lower, result] of batchResults) {
        const isValid = result.found;
        wordCache.set(lower, isValid);
        results.set(lower, isValid);
      }

      // Any words not in the response are assumed valid (to avoid false positives)
      for (const word of uncached) {
        if (!results.has(word)) {
          wordCache.set(word, true);
          results.set(word, true);
        }
      }

      return results;
    },
    [wordCache],
  );

  /**
   * Check if a Lexical text node's DOM element is visible in the viewport.
   */
  const isNodeVisible = useCallback(
    (nodeKey: NodeKey): boolean => {
      const editorElement = editor.getRootElement();
      if (!editorElement) return true; // Assume visible if we can't check

      // Find the DOM element for this node key
      const domElement = editor.getElementByKey(nodeKey);
      if (!domElement) return true; // Assume visible if no DOM element

      const rect = domElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

      // Check if element is within the viewport (with generous margin for near-visible content)
      const margin = 200; // Check 200px beyond viewport for smoother experience
      return (
        rect.bottom >= -margin &&
        rect.top <= viewportHeight + margin &&
        rect.right >= -margin &&
        rect.left <= viewportWidth + margin
      );
    },
    [editor],
  );

  /**
   * Run spell-check (incremental or full).
   * Only checks nodes that are currently visible in the viewport for large documents.
   */
  const runSpellCheck = useCallback(async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      const dirtyLeaves = pendingDirtyLeavesRef.current;
      pendingDirtyLeavesRef.current = null;

      const isIncremental = dirtyLeaves !== null && dirtyLeaves.size > 0;

      const wordsToCheck: Array<{
        word: string;
        nodeKey: NodeKey;
        offset: number;
        length: number;
      }> = [];

      const checkedNodeKeys = new Set<NodeKey>();

      editor.getEditorState().read(() => {
        const root = $getRoot();
        const textNodes = root.getAllTextNodes();
        const isLargeDoc = textNodes.length > 50;

        for (const textNode of textNodes) {
          const nodeKey = textNode.getKey();
          if (isIncremental && !dirtyLeaves.has(nodeKey)) continue;

          // For large documents, only check visible nodes (lazy checking)
          if (isLargeDoc && !isNodeVisible(nodeKey)) continue;

          checkedNodeKeys.add(nodeKey);
          const text = textNode.getTextContent();
          const words = extractWords(text);

          for (const { word, offset } of words) {
            if (word.length <= 1) continue;
            wordsToCheck.push({ word, nodeKey, offset, length: word.length });
          }
        }
      });

      const uniqueWords = [
        ...new Set(
          wordsToCheck
            .map((w) => w.word)
            .filter((w) => !ignoredWords.has(w.toLowerCase())),
        ),
      ];

      const checkResults = await batchCheckWords(uniqueWords);

      const newMisspelled: MisspelledWord[] = [];
      for (const item of wordsToCheck) {
        const lower = item.word.toLowerCase();
        if (ignoredWords.has(lower)) continue;
        const isValid = checkResults.get(lower);
        if (isValid === false) {
          newMisspelled.push(item);
        }
      }

      // Merge with existing results for nodes we didn't re-check
      const updatedByNode = new Map<NodeKey, MisspelledWord[]>(
        isIncremental ? misspelledByNodeRef.current : new Map(),
      );

      for (const key of checkedNodeKeys) {
        updatedByNode.delete(key);
      }

      for (const mw of newMisspelled) {
        const group = updatedByNode.get(mw.nodeKey) || [];
        group.push(mw);
        updatedByNode.set(mw.nodeKey, group);
      }

      misspelledByNodeRef.current = updatedByNode;

      const allMisspelled = [...updatedByNode.values()].flat();
      setMisspelledWords(allMisspelled);

      // Apply decorations (tagged so onChange ignores this update)
      editor.update(() => {
        const root = $getRoot();
        const textNodes = root.getAllTextNodes();

        // Remove spell-check styles from checked nodes
        for (const textNode of textNodes) {
          const nodeKey = textNode.getKey();
          if (isIncremental && !checkedNodeKeys.has(nodeKey)) continue;

          const style = textNode.getStyle();
          if (style && style.includes('text-decoration')) {
            const cleanedStyle = style
              .replace(/text-decoration:\s*underline wavy red;?/g, '')
              .replace(/;\s*$/, '')
              .trim();
            textNode.setStyle(cleanedStyle || '');
          }
        }

        // Apply underline to misspelled words by splitting text nodes
        const nodeGroups = new Map<NodeKey, MisspelledWord[]>();
        for (const mw of allMisspelled) {
          if (isIncremental && !checkedNodeKeys.has(mw.nodeKey)) continue;
          const group = nodeGroups.get(mw.nodeKey) || [];
          group.push(mw);
          nodeGroups.set(mw.nodeKey, group);
        }

        for (const [nodeKey, words] of nodeGroups) {
          const sorted = [...words].sort((a, b) => b.offset - a.offset);

          for (const mw of sorted) {
            try {
              const node = root
                .getAllTextNodes()
                .find((n) => n.getKey() === nodeKey);
              if (!node || !$isTextNode(node)) continue;

              const text = node.getTextContent();
              if (mw.offset + mw.length > text.length) continue;

              const before = text.slice(0, mw.offset);
              const misspelledText = text.slice(mw.offset, mw.offset + mw.length);
              const after = text.slice(mw.offset + mw.length);

              if (before.length > 0) {
                const beforeNode = new TextNode(before);
                beforeNode.setFormat(node.getFormat());
                beforeNode.setStyle(node.getStyle());
                node.insertBefore(beforeNode);
              }

              const misspelledNode = new TextNode(misspelledText);
              misspelledNode.setFormat(node.getFormat());
              misspelledNode.setStyle(
                (node.getStyle() ? node.getStyle() + '; ' : '') +
                  'text-decoration: underline wavy red',
              );
              node.insertBefore(misspelledNode);

              if (after.length > 0) {
                const afterNode = new TextNode(after);
                afterNode.setFormat(node.getFormat());
                afterNode.setStyle(node.getStyle());
                node.insertBefore(afterNode);
              }

              node.remove();
            } catch {
              // Node may have been modified, skip
            }
          }
        }
      }, { tag: 'spell-check' });
    } finally {
      isCheckingRef.current = false;
    }
  }, [editor, batchCheckWords, extractWords, ignoredWords, setMisspelledWords]);

  /**
   * Schedule a spell-check run with adaptive debouncing.
   * Uses requestIdleCallback to avoid blocking user interaction.
   */
  const scheduleSpellCheck = useCallback(
    (dirtyLeaves: Set<NodeKey> | null) => {
      if (dirtyLeaves !== null) {
        if (pendingDirtyLeavesRef.current === null) {
          pendingDirtyLeavesRef.current = new Set(dirtyLeaves);
        } else {
          for (const key of dirtyLeaves) {
            pendingDirtyLeavesRef.current.add(key);
          }
        }
      } else {
        pendingDirtyLeavesRef.current = null;
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      const wordCount = getDocumentWordCount();
      const delay = getAdaptiveDelay(wordCount);

      debounceTimerRef.current = setTimeout(() => {
        // Use requestIdleCallback if available to avoid blocking main thread
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(() => runSpellCheck(), { timeout: 5000 });
        } else {
          setTimeout(() => runSpellCheck(), 0);
        }
      }, delay);
    },
    [runSpellCheck, getDocumentWordCount],
  );

  // Register the full recheck handler so the context/panel can trigger it
  useEffect(() => {
    registerRecheckHandler(() => scheduleSpellCheck(null));
  }, [registerRecheckHandler, scheduleSpellCheck]);

  // Listen for editor updates (only after initial delay)
  useEffect(() => {
    let initialDelayTimer: ReturnType<typeof setTimeout> | null = null;
    let unregister: (() => void) | null = null;

    // Wait before starting spell check to let the user begin editing first
    initialDelayTimer = setTimeout(() => {
      unregister = editor.registerUpdateListener(
        ({ dirtyElements, dirtyLeaves }) => {
          if (dirtyElements.size > 0 || dirtyLeaves.size > 0) {
            scheduleSpellCheck(dirtyLeaves.size > 0 ? dirtyLeaves : null);
          }
        },
      );

      // Run initial full check after startup delay
      scheduleSpellCheck(null);
    }, INITIAL_DELAY_MS);

    return () => {
      if (initialDelayTimer) clearTimeout(initialDelayTimer);
      unregister?.();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [editor, scheduleSpellCheck]);

  // Re-run spell check when ignored words change
  useEffect(() => {
    scheduleSpellCheck(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ignoredWords]);

  // Re-check visible content when user scrolls (for lazy checking in large docs)
  useEffect(() => {
    const editorElement = editor.getRootElement();
    if (!editorElement) return;

    const contentArea = editorElement.closest('.editor-content-area');
    if (!contentArea) return;

    let scrollTimer: ReturnType<typeof setTimeout> | null = null;

    const handleScroll = () => {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        // Schedule a full recheck — the visibility filter will pick up newly visible nodes
        scheduleSpellCheck(null);
      }, 1000); // Wait 1s after scroll stops
    };

    contentArea.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      contentArea.removeEventListener('scroll', handleScroll);
      if (scrollTimer) clearTimeout(scrollTimer);
    };
  }, [editor, scheduleSpellCheck]);

  return null;
}
