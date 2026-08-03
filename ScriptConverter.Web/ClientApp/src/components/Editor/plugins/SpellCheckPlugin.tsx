import { useCallback, useEffect, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $isTextNode, TextNode } from 'lexical';
import type { NodeKey } from 'lexical';
import { Menu, Text } from '@mantine/core';

import type { DictionaryProvider } from '../types';

/** Represents a misspelled word with its position in the editor. */
interface MisspelledWord {
  word: string;
  nodeKey: NodeKey;
  offset: number;
  length: number;
}

/** Base debounce delay in milliseconds. */
const BASE_DEBOUNCE_MS = 300;

/** Maximum debounce delay in milliseconds. */
const MAX_DEBOUNCE_MS = 1000;

/** Number of words per batch for dictionary lookups. */
const BATCH_SIZE = 20;

/**
 * Calculate an adaptive debounce delay based on the total word count
 * of the document. The delay increases for larger documents so that
 * the spell-checker doesn't hammer the dictionary on every keystroke.
 *
 * Formula: base + min(wordCount / 100, maxExtra)
 * e.g. 50k words → 300 + min(500, 700) = 800ms
 */
function getAdaptiveDelay(wordCount: number): number {
  const extra = Math.min(Math.floor(wordCount / 100), MAX_DEBOUNCE_MS - BASE_DEBOUNCE_MS);
  return BASE_DEBOUNCE_MS + extra;
}

/**
 * SpellCheckPlugin — Debounced word checking with red underline decorations
 * and right-click context menu with suggestions.
 *
 * Performance optimizations:
 * - Incremental checking: only re-checks text nodes that changed (dirty leaves)
 * - Persistent word cache: already-verified words aren't re-looked-up
 * - Batched dictionary lookups using Promise.all with chunking
 * - Adaptive debounce: delay increases for larger documents
 */
export default function SpellCheckPlugin({
  dictionaryProvider,
}: {
  dictionaryProvider: DictionaryProvider;
}) {
  const [editor] = useLexicalComposerContext();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [misspelledWords, setMisspelledWords] = useState<MisspelledWord[]>([]);
  const [ignoredWords, setIgnoredWords] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    word: string;
    suggestions: string[];
    nodeKey: NodeKey;
    offset: number;
    length: number;
  } | null>(null);

  const isCheckingRef = useRef(false);

  /**
   * Persistent word cache: maps lowercase word → boolean (true = valid, false = misspelled).
   * Survives across spell-check runs so we don't re-lookup known words.
   */
  const wordCacheRef = useRef<Map<string, boolean>>(new Map());

  /**
   * Tracks which node keys had misspelled words on the last run.
   * Used to merge incremental results with previously found errors.
   */
  const misspelledByNodeRef = useRef<Map<NodeKey, MisspelledWord[]>>(new Map());

  /**
   * Track dirty node keys from the latest update listener firing.
   * null means "full check required" (first run or after ignore/add).
   */
  const pendingDirtyLeavesRef = useRef<Set<NodeKey> | null>(null);

  /**
   * Extract words from text, returning each with its offset in the text.
   */
  const extractWords = useCallback(
    (text: string): Array<{ word: string; offset: number }> => {
      const words: Array<{ word: string; offset: number }> = [];
      // Match word characters including Unicode letters for Urdu/Hindi support
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
   * Get an approximate word count for the document (used for adaptive debounce).
   */
  const getDocumentWordCount = useCallback((): number => {
    let count = 0;
    editor.getEditorState().read(() => {
      const root = $getRoot();
      const textNodes = root.getAllTextNodes();
      for (const node of textNodes) {
        const text = node.getTextContent();
        // Quick estimate: split on whitespace
        count += text.split(/\s+/).filter(Boolean).length;
      }
    });
    return count;
  }, [editor]);

  /**
   * Check words against the dictionary in batches using Promise.all.
   * Returns a map of lowercase word → boolean (true = valid).
   */
  const batchCheckWords = useCallback(
    async (words: string[]): Promise<Map<string, boolean>> => {
      const results = new Map<string, boolean>();
      const cache = wordCacheRef.current;

      // Separate cached from uncached
      const uncached: string[] = [];
      for (const word of words) {
        const lower = word.toLowerCase();
        if (cache.has(lower)) {
          results.set(lower, cache.get(lower)!);
        } else if (!uncached.includes(lower)) {
          uncached.push(lower);
        }
      }

      // Batch-check uncached words
      for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
        const batch = uncached.slice(i, i + BATCH_SIZE);
        const lookupResults = await Promise.all(
          batch.map(async (word) => {
            try {
              const entry = await dictionaryProvider.lookup(word);
              return { word, found: entry !== null };
            } catch {
              // On error, assume word is correct to avoid false positives
              return { word, found: true };
            }
          }),
        );

        for (const { word, found } of lookupResults) {
          cache.set(word, found);
          results.set(word, found);
        }
      }

      return results;
    },
    [dictionaryProvider],
  );

  /**
   * Run spell-check, either incrementally (only dirty nodes) or fully.
   */
  const runSpellCheck = useCallback(async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      const dirtyLeaves = pendingDirtyLeavesRef.current;
      // Reset pending dirty leaves
      pendingDirtyLeavesRef.current = null;

      const isIncremental = dirtyLeaves !== null && dirtyLeaves.size > 0;

      const wordsToCheck: Array<{
        word: string;
        nodeKey: NodeKey;
        offset: number;
        length: number;
      }> = [];

      const checkedNodeKeys = new Set<NodeKey>();

      // Read the editor state to extract words from relevant nodes
      editor.getEditorState().read(() => {
        const root = $getRoot();
        const textNodes = root.getAllTextNodes();

        for (const textNode of textNodes) {
          const nodeKey = textNode.getKey();

          // In incremental mode, only process dirty nodes
          if (isIncremental && !dirtyLeaves.has(nodeKey)) continue;

          checkedNodeKeys.add(nodeKey);
          const text = textNode.getTextContent();
          const words = extractWords(text);

          for (const { word, offset } of words) {
            // Skip single-character words
            if (word.length <= 1) continue;
            wordsToCheck.push({
              word,
              nodeKey,
              offset,
              length: word.length,
            });
          }
        }
      });

      // Collect unique words to check (excluding ignored)
      const uniqueWords = [
        ...new Set(
          wordsToCheck
            .map((w) => w.word)
            .filter((w) => !ignoredWords.has(w.toLowerCase())),
        ),
      ];

      // Batch-check against dictionary
      const checkResults = await batchCheckWords(uniqueWords);

      // Build misspelled list for the checked nodes
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

      // Remove old entries for nodes we just checked
      for (const key of checkedNodeKeys) {
        updatedByNode.delete(key);
      }

      // Add new misspelled entries
      for (const mw of newMisspelled) {
        const group = updatedByNode.get(mw.nodeKey) || [];
        group.push(mw);
        updatedByNode.set(mw.nodeKey, group);
      }

      misspelledByNodeRef.current = updatedByNode;

      // Flatten for state
      const allMisspelled = [...updatedByNode.values()].flat();
      setMisspelledWords(allMisspelled);

      // Apply decorations to misspelled words
      editor.update(() => {
        const root = $getRoot();
        const textNodes = root.getAllTextNodes();

        // Remove spell-check styles only from nodes we checked (or all if full)
        for (const textNode of textNodes) {
          const nodeKey = textNode.getKey();
          if (isIncremental && !checkedNodeKeys.has(nodeKey)) continue;

          const style = textNode.getStyle();
          if (style && style.includes('text-decoration')) {
            const cleanedStyle = style
              .replace(/text-decoration:\s*underline wavy red;?/g, '')
              .trim();
            textNode.setStyle(cleanedStyle || '');
          }
        }

        // Apply underline to misspelled words by splitting text nodes
        const nodeGroups = new Map<NodeKey, MisspelledWord[]>();
        for (const mw of allMisspelled) {
          // In incremental mode, only re-apply to nodes we just checked
          if (isIncremental && !checkedNodeKeys.has(mw.nodeKey)) continue;
          const group = nodeGroups.get(mw.nodeKey) || [];
          group.push(mw);
          nodeGroups.set(mw.nodeKey, group);
        }

        for (const [nodeKey, words] of nodeGroups) {
          // Sort by offset descending so splits don't invalidate earlier offsets
          const sorted = [...words].sort((a, b) => b.offset - a.offset);

          for (const mw of sorted) {
            try {
              const node = root
                .getAllTextNodes()
                .find((n) => n.getKey() === nodeKey);
              if (!node || !$isTextNode(node)) continue;

              const text = node.getTextContent();
              if (mw.offset + mw.length > text.length) continue;

              // Split the node to isolate the misspelled word
              const before = text.slice(0, mw.offset);
              const misspelledText = text.slice(
                mw.offset,
                mw.offset + mw.length,
              );
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
      });
    } finally {
      isCheckingRef.current = false;
    }
  }, [editor, batchCheckWords, extractWords, ignoredWords]);

  /**
   * Schedule a spell-check run with adaptive debouncing.
   * Delay grows proportionally to document size.
   */
  const scheduleSpellCheck = useCallback(
    (dirtyLeaves: Set<NodeKey> | null) => {
      // Accumulate dirty leaves for incremental checking
      if (dirtyLeaves !== null) {
        if (pendingDirtyLeavesRef.current === null) {
          pendingDirtyLeavesRef.current = new Set(dirtyLeaves);
        } else {
          for (const key of dirtyLeaves) {
            pendingDirtyLeavesRef.current.add(key);
          }
        }
      } else {
        // null means full check
        pendingDirtyLeavesRef.current = null;
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      const wordCount = getDocumentWordCount();
      const delay = getAdaptiveDelay(wordCount);

      debounceTimerRef.current = setTimeout(() => {
        runSpellCheck();
      }, delay);
    },
    [runSpellCheck, getDocumentWordCount],
  );

  /**
   * Listen for editor updates and trigger debounced spell-check.
   * Uses dirtyLeaves for incremental checking.
   */
  useEffect(() => {
    const unregister = editor.registerUpdateListener(
      ({ dirtyElements, dirtyLeaves }) => {
        // Only re-check when content actually changed
        if (dirtyElements.size > 0 || dirtyLeaves.size > 0) {
          scheduleSpellCheck(dirtyLeaves.size > 0 ? dirtyLeaves : null);
        }
      },
    );

    // Run initial full spell-check
    scheduleSpellCheck(null);

    return () => {
      unregister();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [editor, scheduleSpellCheck]);

  /**
   * Handle right-click on editor content to show spell-check context menu.
   */
  useEffect(() => {
    const handleContextMenu = async (event: MouseEvent) => {
      const editorElement = editor.getRootElement();
      if (!editorElement || !editorElement.contains(event.target as Node)) {
        return;
      }

      // Check if the right-clicked element has spell-check underline
      const target = event.target as HTMLElement;
      const style = target.style?.textDecoration || '';
      const computedStyle = window.getComputedStyle(target);
      const hasSpellError =
        style.includes('underline wavy red') ||
        computedStyle.textDecoration.includes('underline') ||
        target.closest('[style*="underline wavy red"]');

      if (!hasSpellError) return;

      const word = target.textContent?.trim();
      if (!word) return;

      event.preventDefault();
      event.stopPropagation();

      // Get suggestions from dictionary
      let suggestions: string[] = [];
      try {
        suggestions = await dictionaryProvider.suggest(word);
      } catch {
        suggestions = [];
      }

      // Find the misspelled word info
      let nodeKey: NodeKey = '';
      let offset = 0;
      let length = word.length;

      editor.getEditorState().read(() => {
        const root = $getRoot();
        const textNodes = root.getAllTextNodes();
        for (const node of textNodes) {
          if (node.getTextContent() === word) {
            const nodeStyle = node.getStyle();
            if (nodeStyle && nodeStyle.includes('underline wavy red')) {
              nodeKey = node.getKey();
              offset = 0;
              length = word.length;
              break;
            }
          }
        }
      });

      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        word,
        suggestions,
        nodeKey,
        offset,
        length,
      });
    };

    const editorElement = editor.getRootElement();
    if (editorElement) {
      editorElement.addEventListener('contextmenu', handleContextMenu);
      return () => {
        editorElement.removeEventListener('contextmenu', handleContextMenu);
      };
    }
  }, [editor, dictionaryProvider, misspelledWords]);

  /**
   * Close context menu when clicking elsewhere.
   */
  useEffect(() => {
    if (!contextMenu?.visible) return;

    const handleClick = () => {
      setContextMenu(null);
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [contextMenu?.visible]);

  /**
   * Replace a misspelled word with a suggestion.
   */
  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      if (!contextMenu) return;

      editor.update(() => {
        const root = $getRoot();
        const textNodes = root.getAllTextNodes();

        for (const node of textNodes) {
          if (
            node.getKey() === contextMenu.nodeKey &&
            node.getTextContent() === contextMenu.word
          ) {
            const style = node.getStyle();
            if (style && style.includes('underline wavy red')) {
              // Replace with suggestion and remove underline
              node.setTextContent(suggestion);
              const cleanedStyle = style
                .replace(/text-decoration:\s*underline wavy red;?/g, '')
                .replace(/;\s*$/, '')
                .trim();
              node.setStyle(cleanedStyle);
              break;
            }
          }
        }
      });

      setContextMenu(null);
    },
    [editor, contextMenu],
  );

  /**
   * Add word to dictionary and remove underline from all instances.
   */
  const handleAddToDictionary = useCallback(async () => {
    if (!contextMenu) return;
    const word = contextMenu.word;

    try {
      await dictionaryProvider.addWord({ word, roman: word });
    } catch {
      // Silently fail - word may already exist
    }

    // Update word cache to mark this word as valid
    wordCacheRef.current.set(word.toLowerCase(), true);

    // Remove underline from all instances of this word
    editor.update(() => {
      const root = $getRoot();
      const textNodes = root.getAllTextNodes();

      for (const node of textNodes) {
        const text = node.getTextContent();
        const style = node.getStyle();
        if (
          text.toLowerCase() === word.toLowerCase() &&
          style &&
          style.includes('underline wavy red')
        ) {
          const cleanedStyle = style
            .replace(/text-decoration:\s*underline wavy red;?/g, '')
            .replace(/;\s*$/, '')
            .trim();
          node.setStyle(cleanedStyle);
        }
      }
    });

    setContextMenu(null);
  }, [editor, contextMenu, dictionaryProvider]);

  /**
   * Ignore a word (don't underline for this session).
   */
  const handleIgnore = useCallback(() => {
    if (!contextMenu) return;
    const word = contextMenu.word.toLowerCase();

    setIgnoredWords((prev) => new Set([...prev, word]));

    // Update word cache so future checks skip this word
    wordCacheRef.current.set(word, true);

    // Remove underline from all instances of this word
    editor.update(() => {
      const root = $getRoot();
      const textNodes = root.getAllTextNodes();

      for (const node of textNodes) {
        const text = node.getTextContent();
        const style = node.getStyle();
        if (
          text.toLowerCase() === word &&
          style &&
          style.includes('underline wavy red')
        ) {
          const cleanedStyle = style
            .replace(/text-decoration:\s*underline wavy red;?/g, '')
            .replace(/;\s*$/, '')
            .trim();
          node.setStyle(cleanedStyle);
        }
      }
    });

    setContextMenu(null);
  }, [editor, contextMenu]);

  // Render context menu
  if (!contextMenu?.visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: contextMenu.y,
        left: contextMenu.x,
        zIndex: 1000,
      }}
    >
      <Menu opened onClose={() => setContextMenu(null)} withinPortal={false}>
        <Menu.Target>
          <div style={{ position: 'absolute', top: 0, left: 0 }} />
        </Menu.Target>
        <Menu.Dropdown>
          {contextMenu.suggestions.length > 0 && (
            <>
              <Menu.Label>Suggestions</Menu.Label>
              {contextMenu.suggestions.slice(0, 5).map((suggestion) => (
                <Menu.Item
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <Text size="sm">{suggestion}</Text>
                </Menu.Item>
              ))}
              <Menu.Divider />
            </>
          )}
          <Menu.Item onClick={handleAddToDictionary}>
            <Text size="sm">Add to dictionary</Text>
          </Menu.Item>
          <Menu.Item onClick={handleIgnore}>
            <Text size="sm">Ignore</Text>
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </div>
  );
}
