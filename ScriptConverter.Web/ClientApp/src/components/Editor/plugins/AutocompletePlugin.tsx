import { useCallback, useEffect, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  COMMAND_PRIORITY_HIGH,
} from 'lexical';
import { Paper, Text } from '@mantine/core';

import type { DictionaryProvider } from '../types';

interface SuggestionPopup {
  suggestions: string[];
  position: { top: number; left: number };
  selectedIndex: number;
}

/** Height of each suggestion item in pixels. */
const ITEM_HEIGHT = 28;

/** Maximum visible height for the dropdown (in px). */
const MAX_VISIBLE_HEIGHT = 200;

/** Number of items to over-render above/below the viewport for smooth scrolling. */
const OVERSCAN = 2;

/**
 * VirtualSuggestionList — Renders only the items visible within the scroll
 * viewport, plus a small overscan buffer. This keeps DOM node count constant
 * regardless of how many suggestions the dictionary returns.
 */
function VirtualSuggestionList({
  suggestions,
  selectedIndex,
  onSelect,
  onHover,
}: {
  suggestions: string[];
  selectedIndex: number;
  onSelect: (suggestion: string) => void;
  onHover: (index: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = suggestions.length * ITEM_HEIGHT;
  const visibleHeight = Math.min(totalHeight, MAX_VISIBLE_HEIGHT);
  const visibleCount = Math.ceil(visibleHeight / ITEM_HEIGHT);

  // Calculate which items are visible
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    suggestions.length,
    startIndex + visibleCount + OVERSCAN * 2,
  );

  // Ensure selected item is scrolled into view
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const selectedTop = selectedIndex * ITEM_HEIGHT;
    const selectedBottom = selectedTop + ITEM_HEIGHT;
    const viewTop = container.scrollTop;
    const viewBottom = viewTop + visibleHeight;

    if (selectedTop < viewTop) {
      container.scrollTop = selectedTop;
    } else if (selectedBottom > viewBottom) {
      container.scrollTop = selectedBottom - visibleHeight;
    }
  }, [selectedIndex, visibleHeight]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      setScrollTop(container.scrollTop);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      role="listbox"
      aria-label="Autocomplete suggestions"
      style={{
        maxHeight: MAX_VISIBLE_HEIGHT,
        overflowY: 'auto',
        position: 'relative',
      }}
    >
      {/* Spacer div that sets the full scrollable height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {suggestions.slice(startIndex, endIndex).map((suggestion, i) => {
          const actualIndex = startIndex + i;
          return (
            <Text
              key={suggestion}
              id={`autocomplete-option-${actualIndex}`}
              role="option"
              aria-selected={actualIndex === selectedIndex}
              size="sm"
              px="sm"
              py={4}
              style={{
                position: 'absolute',
                top: actualIndex * ITEM_HEIGHT,
                left: 0,
                right: 0,
                height: ITEM_HEIGHT,
                cursor: 'pointer',
                backgroundColor:
                  actualIndex === selectedIndex
                    ? 'var(--mantine-color-blue-light)'
                    : undefined,
                borderRadius: 'var(--mantine-radius-xs)',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseDown={(e) => {
                // Use mousedown (not click) to fire before blur
                e.preventDefault();
                onSelect(suggestion);
              }}
              onMouseEnter={() => {
                onHover(actualIndex);
              }}
            >
              {suggestion}
            </Text>
          );
        })}
      </div>
    </div>
  );
}

/**
 * AutocompletePlugin — Provides as-you-type word suggestions from the
 * transliteration dictionary. Shows a floating dropdown positioned near
 * the cursor after 2+ characters are typed.
 *
 * Performance optimization: Uses virtual list rendering so that only the
 * visible suggestion items are rendered in the DOM, regardless of total
 * suggestion count.
 *
 * - Monitors text input and tracks the current word being typed
 * - After 2+ characters, calls dictionaryProvider.search(prefix)
 * - Shows a floating dropdown near the cursor with matches
 * - Tab/Enter accepts the top/selected suggestion
 * - Arrow keys (Up/Down) navigate suggestions
 * - Escape dismisses the popup
 */
export default function AutocompletePlugin({
  dictionaryProvider,
}: {
  dictionaryProvider: DictionaryProvider;
}) {
  const [editor] = useLexicalComposerContext();
  const [popup, setPopup] = useState<SuggestionPopup | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPrefixRef = useRef<string>('');
  const isSearchingRef = useRef(false);

  /**
   * Get the current word prefix being typed (text before the cursor
   * within the current text node, up to the last word boundary).
   */
  const getCurrentWordPrefix = useCallback((): string | null => {
    let prefix: string | null = null;

    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection) || !selection.isCollapsed()) return;

      const anchor = selection.anchor;
      if (anchor.type !== 'text') return;

      const node = anchor.getNode();
      if (!$isTextNode(node)) return;

      const textContent = node.getTextContent();
      const offset = anchor.offset;

      // Walk backwards from cursor to find the start of the current word
      let wordStart = offset;
      while (wordStart > 0) {
        const char = textContent[wordStart - 1];
        // Word boundary: space, punctuation, etc.
        if (/[\s\p{P}]/u.test(char)) break;
        wordStart--;
      }

      const word = textContent.slice(wordStart, offset);
      if (word.length >= 2) {
        prefix = word;
      }
    });

    return prefix;
  }, [editor]);

  /**
   * Get the caret position in the DOM for positioning the popup.
   */
  const getCaretPosition = useCallback((): { top: number; left: number } | null => {
    const domSelection = window.getSelection();
    if (!domSelection || domSelection.rangeCount === 0) return null;

    const range = domSelection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (rect.width === 0 && rect.height === 0) {
      // Fallback: use the parent element's rect
      const parent = range.startContainer.parentElement;
      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        return {
          top: parentRect.bottom + 4,
          left: parentRect.left,
        };
      }
      return null;
    }

    return {
      top: rect.bottom + 4,
      left: rect.left,
    };
  }, []);

  /**
   * Search the dictionary for suggestions matching the current prefix.
   */
  const searchSuggestions = useCallback(
    async (prefix: string) => {
      if (isSearchingRef.current) return;
      isSearchingRef.current = true;

      try {
        const results = await dictionaryProvider.search(prefix, 8);

        // Only show if the prefix hasn't changed while we were searching
        if (currentPrefixRef.current !== prefix) return;

        if (results.length === 0) {
          setPopup(null);
          return;
        }

        const position = getCaretPosition();
        if (!position) {
          setPopup(null);
          return;
        }

        setPopup({
          suggestions: results,
          position,
          selectedIndex: 0,
        });
      } catch {
        // On error, dismiss the popup silently
        setPopup(null);
      } finally {
        isSearchingRef.current = false;
      }
    },
    [dictionaryProvider, getCaretPosition],
  );

  /**
   * Accept the currently selected suggestion — replaces the typed prefix
   * with the full word.
   */
  const acceptSuggestion = useCallback(
    (suggestion: string) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) return;

        const anchor = selection.anchor;
        if (anchor.type !== 'text') return;

        const node = anchor.getNode();
        if (!$isTextNode(node)) return;

        const textContent = node.getTextContent();
        const offset = anchor.offset;

        // Find the start of the current word
        let wordStart = offset;
        while (wordStart > 0) {
          const char = textContent[wordStart - 1];
          if (/[\s\p{P}]/u.test(char)) break;
          wordStart--;
        }

        // Replace the prefix with the full suggestion
        const before = textContent.slice(0, wordStart);
        const after = textContent.slice(offset);
        const newText = before + suggestion + after;

        node.setTextContent(newText);

        // Move cursor to end of the inserted suggestion
        const newOffset = wordStart + suggestion.length;
        selection.anchor.set(node.getKey(), newOffset, 'text');
        selection.focus.set(node.getKey(), newOffset, 'text');
      });

      setPopup(null);
      currentPrefixRef.current = '';
    },
    [editor],
  );

  /**
   * Listen for editor text changes and trigger autocomplete search.
   */
  useEffect(() => {
    const unregister = editor.registerUpdateListener(
      ({ editorState, dirtyLeaves, prevEditorState }) => {
        // Only trigger on actual content changes
        if (dirtyLeaves.size === 0) return;

        // Debounce the search
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
          const prefix = getCurrentWordPrefix();

          if (!prefix) {
            setPopup(null);
            currentPrefixRef.current = '';
            return;
          }

          currentPrefixRef.current = prefix;
          searchSuggestions(prefix);
        }, 150);
      },
    );

    return () => {
      unregister();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [editor, getCurrentWordPrefix, searchSuggestions]);

  /**
   * Register keyboard commands for navigating and accepting suggestions.
   */
  useEffect(() => {
    const removeArrowDown = editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      (event) => {
        if (!popup) return false;
        event?.preventDefault();
        setPopup((prev) =>
          prev
            ? {
                ...prev,
                selectedIndex: Math.min(
                  prev.selectedIndex + 1,
                  prev.suggestions.length - 1,
                ),
              }
            : null,
        );
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );

    const removeArrowUp = editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      (event) => {
        if (!popup) return false;
        event?.preventDefault();
        setPopup((prev) =>
          prev
            ? {
                ...prev,
                selectedIndex: Math.max(prev.selectedIndex - 1, 0),
              }
            : null,
        );
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );

    const removeEnter = editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        if (!popup) return false;
        event?.preventDefault();
        acceptSuggestion(popup.suggestions[popup.selectedIndex]);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );

    const removeTab = editor.registerCommand(
      KEY_TAB_COMMAND,
      (event) => {
        if (!popup) return false;
        event?.preventDefault();
        acceptSuggestion(popup.suggestions[popup.selectedIndex]);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );

    const removeEscape = editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        if (!popup) return false;
        setPopup(null);
        currentPrefixRef.current = '';
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );

    return () => {
      removeArrowDown();
      removeArrowUp();
      removeEnter();
      removeTab();
      removeEscape();
    };
  }, [editor, popup, acceptSuggestion]);

  /**
   * Dismiss popup when the editor loses focus.
   */
  useEffect(() => {
    const editorElement = editor.getRootElement();
    if (!editorElement) return;

    const handleBlur = (e: FocusEvent) => {
      // Don't dismiss if clicking within the popup itself
      const relatedTarget = e.relatedTarget as HTMLElement | null;
      if (relatedTarget?.closest('.autocomplete-popup')) return;

      // Small delay to allow click events on popup items to fire
      setTimeout(() => {
        setPopup(null);
        currentPrefixRef.current = '';
      }, 150);
    };

    editorElement.addEventListener('blur', handleBlur);
    return () => {
      editorElement.removeEventListener('blur', handleBlur);
    };
  }, [editor]);

  if (!popup) return null;

  return (
    <>
      {/* Screen reader announcement for suggestion count */}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {popup.suggestions.length} suggestion{popup.suggestions.length !== 1 ? 's' : ''} available. Use arrow keys to navigate.
      </div>
      <Paper
        className="autocomplete-popup"
        shadow="md"
        withBorder
        role="dialog"
        aria-label="Autocomplete suggestions"
        style={{
          position: 'fixed',
          top: popup.position.top,
          left: popup.position.left,
          zIndex: 1000,
          minWidth: 150,
          maxWidth: 300,
        }}
      >
        <VirtualSuggestionList
          suggestions={popup.suggestions}
          selectedIndex={popup.selectedIndex}
          onSelect={acceptSuggestion}
          onHover={(index) => {
            setPopup((prev) =>
              prev ? { ...prev, selectedIndex: index } : null,
            );
          }}
        />
      </Paper>
    </>
  );
}
