import { useCallback, useEffect, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $isTextNode } from 'lexical';
import {
  Badge,
  Button,
  Divider,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
} from '@mantine/core';

import { useSpellCheck } from './SpellCheckContext';
import { useI18n } from '../../../i18n';
import { trackSpellCheckReplacement } from '../providers/ApiDictionaryProvider';
import type { DictEntry } from '../types';

const SPELL_CHECK_TAG = 'spell-check';

interface PopupState {
  word: string;
  x: number;
  y: number;
  suggestions: string[];
  entry: DictEntry | null;
  isMisspelled: boolean;
  loading: boolean;
}

/**
 * SpellCheckPopup — Shows a floating popup when the user clicks on a word
 * in the editor. If the word is misspelled (has red wavy underline), shows
 * suggestions, replace, add to dict, ignore, ignore all. If the word is
 * correct and found in dictionary, shows the meaning.
 */
export default function SpellCheckPopup() {
  const [editor] = useLexicalComposerContext();
  const { t } = useI18n();
  const {
    ignoredWords,
    ignoreWord,
    ignoreAllWord,
    dictionaryProvider,
    requestFullRecheck,
    wordCache,
  } = useSpellCheck();

  const [popup, setPopup] = useState<PopupState | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const showDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Handle click on editor content — show popup after 1 second delay.
   */
  useEffect(() => {
    const editorElement = editor.getRootElement();
    if (!editorElement) return;

    const handleClick = (event: MouseEvent) => {
      // Cancel any pending popup
      if (showDelayRef.current) {
        clearTimeout(showDelayRef.current);
        showDelayRef.current = null;
      }

      const target = event.target as HTMLElement;

      // Only handle clicks on text content inside the editor
      if (!editorElement.contains(target)) return;

      // Check if clicked element has spell-check underline (misspelled)
      const style = target.style?.textDecoration || '';
      const isMisspelled =
        style.includes('underline wavy red') ||
        !!target.closest('[style*="underline wavy red"]');

      // Get the word text
      const word = target.textContent?.trim();
      if (!word || word.length <= 1 || /\s/.test(word)) return;

      // Only show popup for misspelled words or single-word clicks
      if (!isMisspelled && target.tagName !== 'SPAN' && target.closest('.editor-root') === null) {
        return;
      }

      const rect = target.getBoundingClientRect();
      const x = rect.left;
      const y = rect.bottom + 4;

      // For misspelled words, show immediately; for correct words, delay 1 second
      const delay = isMisspelled ? 0 : 1000;

      showDelayRef.current = setTimeout(async () => {
        showDelayRef.current = null;

        setPopup({
          word,
          x,
          y,
          suggestions: [],
          entry: null,
          isMisspelled,
          loading: true,
        });

        // Fetch suggestions or meaning
        try {
          if (isMisspelled) {
            const suggestions = await dictionaryProvider.suggest(word);
            setPopup((prev) =>
              prev && prev.word === word
                ? { ...prev, suggestions: suggestions.slice(0, 5), loading: false }
                : prev,
            );
          } else {
            const entry = await dictionaryProvider.lookup(word);
            setPopup((prev) =>
              prev && prev.word === word
                ? { ...prev, entry, loading: false }
                : prev,
            );
          }
        } catch {
          setPopup((prev) =>
            prev && prev.word === word ? { ...prev, loading: false } : prev,
          );
        }
      }, delay);
    };

    editorElement.addEventListener('click', handleClick);
    return () => {
      editorElement.removeEventListener('click', handleClick);
      if (showDelayRef.current) {
        clearTimeout(showDelayRef.current);
      }
    };
  }, [editor, dictionaryProvider]);

  /**
   * Close popup on click outside.
   */
  useEffect(() => {
    if (!popup) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setPopup(null);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [popup]);

  /**
   * Close on Escape key.
   */
  useEffect(() => {
    if (!popup) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPopup(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [popup]);

  /**
   * Replace a misspelled word with a suggestion.
   */
  const handleReplace = useCallback(
    (suggestion: string) => {
      if (!popup) return;

      editor.update(() => {
        const root = $getRoot();
        const textNodes = root.getAllTextNodes();

        for (const node of textNodes) {
          if (node.getTextContent() === popup.word) {
            const nodeStyle = node.getStyle();
            if (nodeStyle && nodeStyle.includes('underline wavy red')) {
              node.setTextContent(suggestion);
              const cleanedStyle = nodeStyle
                .replace(/text-decoration:\s*underline wavy red;?/g, '')
                .replace(/;\s*$/, '')
                .trim();
              node.setStyle(cleanedStyle);
              break;
            }
          }
        }
      }, { tag: SPELL_CHECK_TAG });

      // Track the replacement on the backend
      trackSpellCheckReplacement(popup.word, suggestion);

      setPopup(null);
    },
    [editor, popup],
  );

  /**
   * Add word to dictionary.
   */
  const handleAddToDict = useCallback(async () => {
    if (!popup) return;
    const word = popup.word;

    try {
      await dictionaryProvider.addWord({ word, roman: word });
    } catch {
      // Silently fail
    }

    wordCache.set(word.toLowerCase(), true);

    // Remove underline from all instances
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
    }, { tag: SPELL_CHECK_TAG });

    requestFullRecheck();
    setPopup(null);
  }, [editor, popup, dictionaryProvider, wordCache, requestFullRecheck]);

  /**
   * Ignore word (this session only).
   */
  const handleIgnore = useCallback(() => {
    if (!popup) return;
    ignoreWord(popup.word);

    // Remove underline from this instance
    editor.update(() => {
      const root = $getRoot();
      const textNodes = root.getAllTextNodes();
      for (const node of textNodes) {
        const text = node.getTextContent();
        const style = node.getStyle();
        if (
          text.toLowerCase() === popup.word.toLowerCase() &&
          style &&
          style.includes('underline wavy red')
        ) {
          const cleanedStyle = style
            .replace(/text-decoration:\s*underline wavy red;?/g, '')
            .replace(/;\s*$/, '')
            .trim();
          node.setStyle(cleanedStyle);
          break; // Only first instance for "Ignore"
        }
      }
    }, { tag: SPELL_CHECK_TAG });

    setPopup(null);
  }, [editor, popup, ignoreWord]);

  /**
   * Ignore all instances of a word (this session).
   */
  const handleIgnoreAll = useCallback(() => {
    if (!popup) return;
    ignoreAllWord(popup.word);

    // Remove underline from ALL instances
    editor.update(() => {
      const root = $getRoot();
      const textNodes = root.getAllTextNodes();
      for (const node of textNodes) {
        const text = node.getTextContent();
        const style = node.getStyle();
        if (
          text.toLowerCase() === popup.word.toLowerCase() &&
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
    }, { tag: SPELL_CHECK_TAG });

    requestFullRecheck();
    setPopup(null);
  }, [editor, popup, ignoreAllWord, requestFullRecheck]);

  if (!popup) return null;

  return (
    <Paper
      ref={popupRef}
      shadow="lg"
      withBorder
      p="sm"
      role="dialog"
      aria-label={`Spell check: ${popup.word}`}
      style={{
        position: 'fixed',
        top: popup.y,
        left: popup.x,
        zIndex: 1000,
        minWidth: 200,
        maxWidth: 320,
      }}
    >
      <Stack gap="xs">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Text fw={600} size="sm">
            {popup.word}
          </Text>
          {popup.loading && <Loader size="xs" />}
          {!popup.loading && popup.isMisspelled && (
            <Badge size="xs" color="red" variant="light">
              {t('spellCheckNotInDict')}
            </Badge>
          )}
          {!popup.loading && !popup.isMisspelled && popup.entry && (
            <Badge size="xs" color="green" variant="light">
              {t('spellCheckCorrect')}
            </Badge>
          )}
        </Group>

        {/* Misspelled word: suggestions */}
        {popup.isMisspelled && !popup.loading && (
          <>
            {popup.suggestions.length > 0 ? (
              <>
                <Text size="xs" c="dimmed">{t('spellCheckSuggestions')}:</Text>
                <Stack gap={2}>
                  {popup.suggestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      size="xs"
                      variant="light"
                      justify="flex-start"
                      fullWidth
                      onClick={() => handleReplace(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </Stack>
              </>
            ) : (
              <Text size="xs" c="dimmed">{t('spellCheckNoSuggestions')}</Text>
            )}

            <Divider />
            <Group gap="xs" wrap="wrap">
              <Button size="xs" variant="subtle" onClick={handleAddToDict}>
                {t('spellCheckAddToDict')}
              </Button>
              <Button size="xs" variant="subtle" onClick={handleIgnore}>
                {t('spellCheckIgnore')}
              </Button>
              <Button size="xs" variant="subtle" onClick={handleIgnoreAll}>
                {t('spellCheckIgnoreAll')}
              </Button>
            </Group>
          </>
        )}

        {/* Correct word: show meaning */}
        {!popup.isMisspelled && !popup.loading && popup.entry && (
          <>
            {popup.entry.meaning && (
              <>
                <Divider />
                <Text size="xs" c="dimmed" fw={500}>{t('spellCheckMeaning')}:</Text>
                <Text size="sm">{popup.entry.meaning}</Text>
              </>
            )}
            {(popup.entry.roman || popup.entry.urdu || popup.entry.hindi) && (
              <>
                <Divider />
                <Stack gap={2}>
                  {popup.entry.roman && (
                    <Group gap="xs">
                      <Badge size="xs" variant="light" color="blue">Roman</Badge>
                      <Text size="xs">{popup.entry.roman}</Text>
                    </Group>
                  )}
                  {popup.entry.urdu && (
                    <Group gap="xs">
                      <Badge size="xs" variant="light" color="green">Urdu</Badge>
                      <Text size="xs" dir="rtl">{popup.entry.urdu}</Text>
                    </Group>
                  )}
                  {popup.entry.hindi && (
                    <Group gap="xs">
                      <Badge size="xs" variant="light" color="orange">Hindi</Badge>
                      <Text size="xs">{popup.entry.hindi}</Text>
                    </Group>
                  )}
                </Stack>
              </>
            )}
          </>
        )}

        {/* Correct word but not in dictionary */}
        {!popup.isMisspelled && !popup.loading && !popup.entry && (
          <Text size="xs" c="dimmed">{t('spellCheckNoSuggestions')}</Text>
        )}
      </Stack>
    </Paper>
  );
}
