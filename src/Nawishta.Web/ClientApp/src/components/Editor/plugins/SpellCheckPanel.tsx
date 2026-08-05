import { useCallback, useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $isTextNode } from 'lexical';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconX } from '@tabler/icons-react';

import { useSpellCheck } from './SpellCheckContext';
import { useI18n } from '../../../i18n';
import { trackSpellCheckReplacement } from '../providers/ApiDictionaryProvider';

const SPELL_CHECK_TAG = 'spell-check';

/**
 * SpellCheckPanel — A sidebar wizard that sequentially walks through all
 * misspelled words, offering the same correction options as the popup:
 * replace with suggestion, add to dictionary, ignore, ignore all.
 *
 * Triggered by setting isPanelOpen=true via the SpellCheckContext.
 */
export default function SpellCheckPanel({ direction = 'ltr' }: { direction?: 'ltr' | 'rtl' }) {
  const [editor] = useLexicalComposerContext();
  const { t } = useI18n();
  const {
    misspelledWords,
    ignoreWord,
    ignoreAllWord,
    dictionaryProvider,
    wordCache,
    isPanelOpen,
    closePanel,
    requestFullRecheck,
    removeWordFromList,
  } = useSpellCheck();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [customWord, setCustomWord] = useState('');

  // Reset index when panel opens
  useEffect(() => {
    if (isPanelOpen) {
      setCurrentIndex(0);
    }
  }, [isPanelOpen]);

  // Clamp index when misspelledWords shrinks (after ignore/replace)
  useEffect(() => {
    if (currentIndex >= misspelledWords.length && misspelledWords.length > 0) {
      setCurrentIndex(misspelledWords.length - 1);
    }
  }, [misspelledWords.length, currentIndex]);

  const currentWord = misspelledWords[currentIndex] ?? null;
  const currentWordText = currentWord?.word ?? null;

  // Fetch suggestions only when the current word changes (not on every misspelledWords update)
  useEffect(() => {
    if (!isPanelOpen || !currentWordText) {
      setSuggestions([]);
      setCustomWord('');
      return;
    }

    setCustomWord('');
    let cancelled = false;
    setLoading(true);

    dictionaryProvider
      .suggest(currentWordText)
      .then((results) => {
        if (!cancelled) {
          setSuggestions(results.slice(0, 8));
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSuggestions([]);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isPanelOpen, currentWordText, dictionaryProvider]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, misspelledWords.length - 1));
  }, [misspelledWords.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  /**
   * Replace current misspelled word with a suggestion.
   */
  const handleReplace = useCallback(
    (suggestion: string) => {
      if (!currentWord) return;

      editor.update(() => {
        const root = $getRoot();
        const textNodes = root.getAllTextNodes();

        for (const node of textNodes) {
          if (node.getTextContent() === currentWord.word) {
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
      if (currentWord) {
        trackSpellCheckReplacement(currentWord.word, suggestion);
      }

      // Move to next word or stay at same index (list will shift)
      requestFullRecheck();
    },
    [editor, currentWord, requestFullRecheck],
  );

  /**
   * Replace current misspelled word with the custom text input.
   */
  const handleReplaceCustom = useCallback(() => {
    if (!customWord.trim()) return;
    handleReplace(customWord.trim());
    setCustomWord('');
  }, [customWord, handleReplace]);

  /**
   * Replace ALL instances of the current misspelled word with the custom text.
   */
  const handleReplaceAll = useCallback(() => {
    if (!currentWord || !customWord.trim()) return;
    const replacement = customWord.trim();

    editor.update(() => {
      const root = $getRoot();
      const textNodes = root.getAllTextNodes();

      for (const node of textNodes) {
        if (node.getTextContent().toLowerCase() === currentWord.word.toLowerCase()) {
          const nodeStyle = node.getStyle();
          if (nodeStyle && nodeStyle.includes('underline wavy red')) {
            node.setTextContent(replacement);
            const cleanedStyle = nodeStyle
              .replace(/text-decoration:\s*underline wavy red;?/g, '')
              .replace(/;\s*$/, '')
              .trim();
            node.setStyle(cleanedStyle);
          }
        }
      }
    }, { tag: SPELL_CHECK_TAG });

    trackSpellCheckReplacement(currentWord.word, replacement);
    removeWordFromList(currentWord.word);
    requestFullRecheck();
    setCustomWord('');
  }, [editor, currentWord, customWord, removeWordFromList, requestFullRecheck]);

  /**
   * Add current word to dictionary.
   */
  const handleAddToDict = useCallback(async () => {
    if (!currentWord) return;

    try {
      await dictionaryProvider.addWord({ word: currentWord.word, roman: currentWord.word });
    } catch {
      // Silently fail
    }

    wordCache.set(currentWord.word.toLowerCase(), true);

    // Remove underline from all instances
    editor.update(() => {
      const root = $getRoot();
      const textNodes = root.getAllTextNodes();
      for (const node of textNodes) {
        const text = node.getTextContent();
        const style = node.getStyle();
        if (
          text.toLowerCase() === currentWord.word.toLowerCase() &&
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

    // Immediately remove from list so panel advances to next word
    removeWordFromList(currentWord.word);
    requestFullRecheck();
  }, [editor, currentWord, dictionaryProvider, wordCache, requestFullRecheck, removeWordFromList]);

  /**
   * Ignore current word (single instance behavior — moves to next).
   */
  const handleIgnore = useCallback(() => {
    if (!currentWord) return;
    ignoreWord(currentWord.word);

    // Remove underline from all instances of this word
    editor.update(() => {
      const root = $getRoot();
      const textNodes = root.getAllTextNodes();
      for (const node of textNodes) {
        const text = node.getTextContent();
        const style = node.getStyle();
        if (
          text.toLowerCase() === currentWord.word.toLowerCase() &&
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

    // Immediately remove from list so panel advances to next word
    removeWordFromList(currentWord.word);
    requestFullRecheck();
  }, [editor, currentWord, ignoreWord, requestFullRecheck, removeWordFromList]);

  /**
   * Ignore all instances of current word.
   */
  const handleIgnoreAll = useCallback(() => {
    if (!currentWord) return;
    ignoreAllWord(currentWord.word);

    editor.update(() => {
      const root = $getRoot();
      const textNodes = root.getAllTextNodes();
      for (const node of textNodes) {
        const text = node.getTextContent();
        const style = node.getStyle();
        if (
          text.toLowerCase() === currentWord.word.toLowerCase() &&
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

    // Immediately remove from list so panel advances to next word
    removeWordFromList(currentWord.word);
    requestFullRecheck();
  }, [editor, currentWord, ignoreAllWord, requestFullRecheck, removeWordFromList]);

  if (!isPanelOpen) return null;

  return (
    <Paper
      withBorder
      p="md"
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 280,
        zIndex: 100,
        overflowY: 'auto',
        background: 'var(--mantine-color-body)',
        ...(direction === 'rtl'
          ? { left: 0, right: 'auto', borderRight: '1px solid var(--mantine-color-default-border)' }
          : { right: 0, left: 'auto', borderLeft: '1px solid var(--mantine-color-default-border)' }
        ),
      }}
      role="complementary"
      aria-label={t('spellCheckPanelTitle')}
    >
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Title order={5}>{t('spellCheckPanelTitle')}</Title>
          <ActionIcon variant="subtle" size="sm" onClick={closePanel} aria-label={t('cancel')}>
            <IconX size={16} />
          </ActionIcon>
        </Group>

        <Divider />

        {/* No errors state */}
        {misspelledWords.length === 0 && (
          <Stack align="center" py="xl" gap="sm">
            <Text size="sm" c="dimmed" ta="center">
              {t('spellCheckPanelNoErrors')}
            </Text>
            <Button variant="light" size="xs" onClick={closePanel}>
              {t('spellCheckPanelDone')}
            </Button>
          </Stack>
        )}

        {/* Current word review */}
        {misspelledWords.length > 0 && currentWord && (
          <>
            {/* Navigation */}
            <Group justify="space-between" align="center">
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                aria-label={t('spellCheckPanelPrev')}
              >
                {direction === 'rtl' ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
              </ActionIcon>
              <Text size="xs" c="dimmed">
                {currentIndex + 1} {t('spellCheckPanelOf')} {misspelledWords.length}
              </Text>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={handleNext}
                disabled={currentIndex >= misspelledWords.length - 1}
                aria-label={t('spellCheckPanelNext')}
              >
                {direction === 'rtl' ? <IconChevronLeft size={16} /> : <IconChevronRight size={16} />}
              </ActionIcon>
            </Group>

            {/* Current word */}
            <Box
              p="sm"
              style={{
                border: '1px solid var(--mantine-color-red-3)',
                borderRadius: 'var(--mantine-radius-sm)',
                background: 'var(--mantine-color-red-0)',
              }}
            >
              <Group gap="xs" align="center">
                <Text size="xs" c="dimmed">{t('spellCheckPanelWordLabel')}:</Text>
                <Text fw={600} size="sm" c="red">
                  {currentWord.word}
                </Text>
                <Badge size="xs" color="red" variant="light">
                  {t('spellCheckNotInDict')}
                </Badge>
              </Group>
            </Box>

            {/* Suggestions */}
            {loading ? (
              <Group justify="center" py="sm">
                <Loader size="sm" />
              </Group>
            ) : (
              <>
                <Text size="xs" c="dimmed" fw={500}>
                  {t('spellCheckSuggestions')}:
                </Text>
                {suggestions.length > 0 ? (
                  <Stack gap={2}>
                    {suggestions.map((suggestion) => (
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
                ) : (
                  <Text size="xs" c="dimmed">{t('spellCheckNoSuggestions')}</Text>
                )}
              </>
            )}

            <Divider />

            {/* Custom replacement input */}
            <Group gap="xs" wrap="nowrap">
              <TextInput
                size="xs"
                placeholder={t('spellCheckReplaceWith')}
                value={customWord}
                onChange={(e) => setCustomWord(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleReplaceCustom();
                  }
                }}
                style={{ flex: 1 }}
              />
            </Group>
            <Group gap="xs">
              <Button
                size="xs"
                variant="light"
                onClick={handleReplaceCustom}
                disabled={!customWord.trim()}
                style={{ flex: 1 }}
              >
                {t('spellCheckReplace')}
              </Button>
              <Button
                size="xs"
                variant="light"
                color="orange"
                onClick={handleReplaceAll}
                disabled={!customWord.trim()}
                style={{ flex: 1 }}
              >
                {t('spellCheckReplaceAll')}
              </Button>
            </Group>

            <Divider />

            {/* Actions */}
            <Stack gap="xs">
              <Button size="xs" variant="light" onClick={handleAddToDict} fullWidth>
                {t('spellCheckAddToDict')}
              </Button>
              <Button size="xs" variant="subtle" onClick={handleIgnore} fullWidth>
                {t('spellCheckIgnore')}
              </Button>
              <Button size="xs" variant="subtle" onClick={handleIgnoreAll} fullWidth>
                {t('spellCheckIgnoreAll')}
              </Button>
            </Stack>
          </>
        )}
      </Stack>
    </Paper>
  );
}
