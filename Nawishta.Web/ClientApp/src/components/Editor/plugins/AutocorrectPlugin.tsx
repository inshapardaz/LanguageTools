import { useCallback, useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, $isTextNode } from 'lexical';

import type { DictionaryProvider } from '../types';

/** Result of extracting the previous word at a word boundary. */
interface WordBoundaryResult {
  word: string;
  wordStart: number;
  nodeKey: string;
}

/**
 * AutocorrectPlugin — Automatically corrects known misspellings on word
 * boundaries using dictionary mappings.
 *
 * - After a word boundary (space, punctuation, Enter), checks the previous word
 * - If the word is not found in the dictionary, fetches suggestions
 * - If a suggestion exists, auto-replaces the word with the top suggestion
 * - Replacement happens inside editor.update() so it integrates with undo history
 * - Can be toggled on/off via the `enabled` prop
 * - Prevents infinite correction loops by tracking recently corrected words
 */
export default function AutocorrectPlugin({
  dictionaryProvider,
  enabled = true,
}: {
  dictionaryProvider: DictionaryProvider;
  enabled?: boolean;
}) {
  const [editor] = useLexicalComposerContext();
  const isCorrectingRef = useRef(false);
  const lastCorrectedRef = useRef<string>('');

  /** Word boundary pattern: spaces, punctuation, and Unicode punctuation. */
  const WORD_BOUNDARY_REGEX = /[\s\p{P}]/u;

  /**
   * Extract the word preceding a word boundary from the current cursor position.
   * Returns null if no eligible word is found.
   */
  const getPrecedingWord = useCallback((): WordBoundaryResult | null => {
    let result: WordBoundaryResult | null = null;

    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection) || !selection.isCollapsed()) return;

      const anchor = selection.anchor;
      if (anchor.type !== 'text') return;

      const node = anchor.getNode();
      if (!$isTextNode(node)) return;

      const textContent = node.getTextContent();
      const offset = anchor.offset;

      // We need at least 2 characters (1 word char + 1 boundary)
      if (offset < 2) return;

      // The character just before the cursor should be a word boundary
      const lastChar = textContent[offset - 1];
      if (!WORD_BOUNDARY_REGEX.test(lastChar)) return;

      // Walk backwards from the boundary to find the start of the word
      let start = offset - 2;
      while (start >= 0) {
        const char = textContent[start];
        if (WORD_BOUNDARY_REGEX.test(char)) {
          start++;
          break;
        }
        start--;
      }
      if (start < 0) start = 0;

      const word = textContent.slice(start, offset - 1);
      if (word.length < 2) return;

      result = {
        word,
        wordStart: start,
        nodeKey: node.getKey(),
      };
    });

    return result;
  }, [editor]);

  /**
   * Check if the last typed character is a word boundary and, if so,
   * extract and correct the preceding word.
   */
  const handleUpdate = useCallback(async () => {
    if (!enabled || isCorrectingRef.current) return;

    const boundaryResult = getPrecedingWord();
    if (!boundaryResult) return;

    const { word, wordStart, nodeKey } = boundaryResult;

    // Don't re-correct a word we just corrected (prevent loops)
    if (word === lastCorrectedRef.current) {
      lastCorrectedRef.current = '';
      return;
    }

    try {
      // Check if the word exists in the dictionary
      const entry = await dictionaryProvider.lookup(word);
      if (entry !== null) return; // Word is valid, no correction needed

      // Get suggestions
      const suggestions = await dictionaryProvider.suggest(word);
      if (suggestions.length === 0) return;

      const correction = suggestions[0];
      // Don't replace if the suggestion is the same as the typed word
      if (correction.toLowerCase() === word.toLowerCase()) return;

      // Apply the correction within an editor update (creates undo step)
      isCorrectingRef.current = true;
      lastCorrectedRef.current = correction;

      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) return;

        const anchor = selection.anchor;
        if (anchor.type !== 'text') return;

        const node = anchor.getNode();
        if (!$isTextNode(node)) return;

        // Verify the node key still matches (content may have changed)
        if (node.getKey() !== nodeKey) return;

        const currentText = node.getTextContent();
        const currentOffset = anchor.offset;

        // Verify the word is still there at the expected position
        const currentWord = currentText.slice(wordStart, wordStart + word.length);
        if (currentWord !== word) return;

        // Replace the word with the correction
        const before = currentText.slice(0, wordStart);
        const after = currentText.slice(wordStart + word.length);
        const newText = before + correction + after;

        node.setTextContent(newText);

        // Adjust cursor position to account for length difference
        const lengthDiff = correction.length - word.length;
        const newOffset = currentOffset + lengthDiff;

        selection.anchor.set(node.getKey(), newOffset, 'text');
        selection.focus.set(node.getKey(), newOffset, 'text');
      });
    } catch {
      // On error, skip correction silently
    } finally {
      isCorrectingRef.current = false;
    }
  }, [editor, dictionaryProvider, enabled, getPrecedingWord]);

  /**
   * Register an update listener that triggers autocorrect when content changes.
   */
  useEffect(() => {
    if (!enabled) return;

    const unregister = editor.registerUpdateListener(({ dirtyLeaves, tags }) => {
      // Only trigger on actual content changes with dirty leaves
      if (dirtyLeaves.size === 0) return;

      // Skip updates triggered by our own correction to prevent loops
      if (isCorrectingRef.current) return;

      // Skip updates caused by history (undo/redo)
      if (tags.has('history-merge') || tags.has('historic')) return;

      handleUpdate();
    });

    return unregister;
  }, [editor, enabled, handleUpdate]);

  // This plugin renders no UI
  return null;
}
