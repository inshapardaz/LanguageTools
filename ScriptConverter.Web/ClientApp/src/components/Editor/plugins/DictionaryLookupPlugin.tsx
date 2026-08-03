import { useCallback, useEffect, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  KEY_ESCAPE_COMMAND,
  COMMAND_PRIORITY_HIGH,
} from 'lexical';
import {
  Paper,
  Text,
  Button,
  Group,
  Stack,
  Badge,
  Divider,
  Anchor,
  Loader,
} from '@mantine/core';

import type { DictionaryProvider, DictEntry } from '../types';

interface PopupState {
  entry: DictEntry;
  position: { top: number; left: number };
  selectedWord: string;
}

/**
 * DictionaryLookupPlugin — Shows a floating dictionary popup when the user
 * double-clicks a word or selects text and presses Ctrl+D / Cmd+D.
 *
 * The popup displays:
 * - Transliterations (Roman, Urdu, Hindi) from the dictionary entry
 * - Meaning (if available)
 * - "Edit in dictionary" link
 * - "Transliterate in place" buttons that replace the selection with the chosen script
 *
 * Dismiss on Escape, click outside, or when selection changes.
 */
export default function DictionaryLookupPlugin({
  dictionaryProvider,
}: {
  dictionaryProvider: DictionaryProvider;
}) {
  const [editor] = useLexicalComposerContext();
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [loading, setLoading] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  /**
   * Get the currently selected word from the editor.
   * If selection is collapsed, extracts the word at the cursor.
   * If selection is a range, uses the selected text.
   */
  const getSelectedWord = useCallback((): string | null => {
    let word: string | null = null;

    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      if (selection.isCollapsed()) {
        // Collapsed selection: extract word at cursor
        const anchor = selection.anchor;
        if (anchor.type !== 'text') return;

        const node = anchor.getNode();
        if (!$isTextNode(node)) return;

        const textContent = node.getTextContent();
        const offset = anchor.offset;

        // Find word boundaries around cursor
        let wordStart = offset;
        let wordEnd = offset;

        while (wordStart > 0 && /[\p{L}\p{M}]/u.test(textContent[wordStart - 1])) {
          wordStart--;
        }
        while (wordEnd < textContent.length && /[\p{L}\p{M}]/u.test(textContent[wordEnd])) {
          wordEnd++;
        }

        const extracted = textContent.slice(wordStart, wordEnd).trim();
        if (extracted.length > 0) {
          word = extracted;
        }
      } else {
        // Range selection: use selected text
        const text = selection.getTextContent().trim();
        if (text.length > 0 && /^[\p{L}\p{M}\s]+$/u.test(text)) {
          word = text;
        }
      }
    });

    return word;
  }, [editor]);

  /**
   * Get the position of the current DOM selection for popup placement.
   */
  const getSelectionPosition = useCallback((): { top: number; left: number } | null => {
    const domSelection = window.getSelection();
    if (!domSelection || domSelection.rangeCount === 0) return null;

    const range = domSelection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (rect.width === 0 && rect.height === 0) {
      const parent = range.startContainer.parentElement;
      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        return {
          top: parentRect.bottom + 6,
          left: parentRect.left,
        };
      }
      return null;
    }

    return {
      top: rect.bottom + 6,
      left: rect.left,
    };
  }, []);

  /**
   * Look up a word and show the popup.
   */
  const showLookup = useCallback(
    async (word: string) => {
      if (!word || word.length === 0) return;

      setLoading(true);

      try {
        const entry = await dictionaryProvider.lookup(word);

        if (!entry) {
          // Word not found — still show with what we have
          const position = getSelectionPosition();
          if (position) {
            setPopup({
              entry: { word, roman: undefined, urdu: undefined, hindi: undefined, meaning: undefined },
              position,
              selectedWord: word,
            });
          }
          return;
        }

        const position = getSelectionPosition();
        if (!position) {
          setPopup(null);
          return;
        }

        setPopup({
          entry,
          position,
          selectedWord: word,
        });
      } catch {
        setPopup(null);
      } finally {
        setLoading(false);
      }
    },
    [dictionaryProvider, getSelectionPosition],
  );

  /**
   * Handle double-click on editor to trigger dictionary lookup.
   */
  useEffect(() => {
    const editorElement = editor.getRootElement();
    if (!editorElement) return;

    const handleDblClick = () => {
      // Small delay to let the browser complete the word selection
      setTimeout(() => {
        const word = getSelectedWord();
        if (word) {
          showLookup(word);
        }
      }, 10);
    };

    editorElement.addEventListener('dblclick', handleDblClick);
    return () => {
      editorElement.removeEventListener('dblclick', handleDblClick);
    };
  }, [editor, getSelectedWord, showLookup]);

  /**
   * Handle Ctrl+D / Cmd+D keyboard shortcut to trigger dictionary lookup.
   */
  useEffect(() => {
    const editorElement = editor.getRootElement();
    if (!editorElement) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;
      if (isCtrlOrCmd && event.key === 'd') {
        event.preventDefault();
        event.stopPropagation();

        const word = getSelectedWord();
        if (word) {
          showLookup(word);
        }
      }
    };

    editorElement.addEventListener('keydown', handleKeyDown);
    return () => {
      editorElement.removeEventListener('keydown', handleKeyDown);
    };
  }, [editor, getSelectedWord, showLookup]);

  /**
   * Register Escape key command to dismiss the popup.
   */
  useEffect(() => {
    const removeEscape = editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        if (!popup) return false;
        setPopup(null);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );

    return () => {
      removeEscape();
    };
  }, [editor, popup]);

  /**
   * Dismiss popup on click outside.
   */
  useEffect(() => {
    if (!popup) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setPopup(null);
      }
    };

    // Use a short delay so the click that opened the popup doesn't immediately close it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [popup]);

  /**
   * Dismiss popup when editor selection changes to a different word.
   */
  useEffect(() => {
    if (!popup) return;

    const unregister = editor.registerUpdateListener(() => {
      const currentWord = getSelectedWord();
      if (currentWord !== popup.selectedWord) {
        setPopup(null);
      }
    });

    return () => {
      unregister();
    };
  }, [editor, popup, getSelectedWord]);

  /**
   * Transliterate the selected word in-place with the chosen script.
   */
  const handleTransliterate = useCallback(
    async (targetScript: string) => {
      if (!popup) return;

      const sourceWord = popup.selectedWord;

      // Detect source script heuristically
      let fromScript = 'roman';
      if (/[\u0600-\u06FF]/.test(sourceWord)) {
        fromScript = 'urdu';
      } else if (/[\u0900-\u097F]/.test(sourceWord)) {
        fromScript = 'hindi';
      }

      if (fromScript === targetScript) return;

      try {
        const converted = await dictionaryProvider.convert(
          sourceWord,
          fromScript,
          targetScript,
        );

        if (!converted || converted === sourceWord) return;

        editor.update(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return;

          if (selection.isCollapsed()) {
            // Need to select the word at cursor first
            const anchor = selection.anchor;
            if (anchor.type !== 'text') return;

            const node = anchor.getNode();
            if (!$isTextNode(node)) return;

            const textContent = node.getTextContent();
            const offset = anchor.offset;

            let wordStart = offset;
            let wordEnd = offset;

            while (wordStart > 0 && /[\p{L}\p{M}]/u.test(textContent[wordStart - 1])) {
              wordStart--;
            }
            while (wordEnd < textContent.length && /[\p{L}\p{M}]/u.test(textContent[wordEnd])) {
              wordEnd++;
            }

            // Replace in text content
            const before = textContent.slice(0, wordStart);
            const after = textContent.slice(wordEnd);
            node.setTextContent(before + converted + after);

            // Move cursor to end of replaced word
            const newOffset = wordStart + converted.length;
            selection.anchor.set(node.getKey(), newOffset, 'text');
            selection.focus.set(node.getKey(), newOffset, 'text');
          } else {
            // Range selection: replace selected text
            selection.insertRawText(converted);
          }
        });

        setPopup(null);
      } catch {
        // Silently fail on conversion error
      }
    },
    [popup, editor, dictionaryProvider],
  );

  if (loading && !popup) {
    return null;
  }

  if (!popup) return null;

  const { entry, position } = popup;
  const hasTransliterations = entry.roman || entry.urdu || entry.hindi;
  const hasMeaning = entry.meaning && entry.meaning.length > 0;

  return (
    <Paper
      ref={popupRef}
      className="dictionary-lookup-popup"
      shadow="lg"
      withBorder
      p="sm"
      role="dialog"
      aria-label={`Dictionary lookup: ${entry.word}`}
      aria-modal="false"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 1000,
        minWidth: 220,
        maxWidth: 360,
      }}
    >
      <Stack gap="xs">
        {/* Header: word */}
        <Group justify="space-between" align="center">
          <Text fw={600} size="sm">
            {entry.word}
          </Text>
          {loading && <Loader size="xs" />}
        </Group>

        {/* Transliterations */}
        {hasTransliterations && (
          <>
            <Divider />
            <Stack gap={4}>
              {entry.roman && (
                <Group gap="xs">
                  <Badge size="xs" variant="light" color="blue">
                    Roman
                  </Badge>
                  <Text size="sm">{entry.roman}</Text>
                </Group>
              )}
              {entry.urdu && (
                <Group gap="xs">
                  <Badge size="xs" variant="light" color="green">
                    Urdu
                  </Badge>
                  <Text size="sm" dir="rtl">
                    {entry.urdu}
                  </Text>
                </Group>
              )}
              {entry.hindi && (
                <Group gap="xs">
                  <Badge size="xs" variant="light" color="orange">
                    Hindi
                  </Badge>
                  <Text size="sm">{entry.hindi}</Text>
                </Group>
              )}
            </Stack>
          </>
        )}

        {/* Meaning */}
        {hasMeaning && (
          <>
            <Divider />
            <Text size="xs" c="dimmed">
              {entry.meaning}
            </Text>
          </>
        )}

        {/* Actions */}
        <Divider />
        <Group gap="xs" wrap="wrap" role="group" aria-label="Transliterate in place">
          <Button
            size="xs"
            variant="light"
            color="green"
            onClick={() => handleTransliterate('urdu')}
            aria-label="Transliterate to Urdu"
          >
            → Urdu
          </Button>
          <Button
            size="xs"
            variant="light"
            color="orange"
            onClick={() => handleTransliterate('hindi')}
            aria-label="Transliterate to Hindi"
          >
            → Hindi
          </Button>
          <Button
            size="xs"
            variant="light"
            color="blue"
            onClick={() => handleTransliterate('roman')}
            aria-label="Transliterate to Roman"
          >
            → Roman
          </Button>
        </Group>

        <Anchor
          size="xs"
          href={`/dictionary?edit=${encodeURIComponent(entry.word)}`}
          target="_blank"
        >
          Edit in Dictionary
        </Anchor>
      </Stack>
    </Paper>
  );
}
