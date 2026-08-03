import { useCallback, useEffect, useRef, useState } from 'react';
import { Divider, Group, Text } from '@mantine/core';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot } from 'lexical';

export interface EditorStatusBarProps {
  /** Current zoom level (1.0 = 100%). */
  zoom: number;
}

type DetectedScript = 'Roman' | 'Urdu' | 'Hindi' | 'Mixed' | 'None';

/** Unicode ranges for script detection */
const URDU_REGEX = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
const HINDI_REGEX = /[\u0900-\u097F]/;
const ROMAN_REGEX = /[A-Za-z]/;

/**
 * Detects the dominant script in a string of text.
 * Returns "Mixed" when multiple scripts are present.
 */
function detectScript(text: string): DetectedScript {
  if (!text.trim()) return 'None';

  const hasUrdu = URDU_REGEX.test(text);
  const hasHindi = HINDI_REGEX.test(text);
  const hasRoman = ROMAN_REGEX.test(text);

  const count = [hasUrdu, hasHindi, hasRoman].filter(Boolean).length;
  if (count === 0) return 'None';
  if (count > 1) return 'Mixed';
  if (hasUrdu) return 'Urdu';
  if (hasHindi) return 'Hindi';
  return 'Roman';
}

/** Format a number with commas (e.g., 1234 → "1,234"). */
function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

/**
 * EditorStatusBar displays word count, character count, detected script, and zoom level.
 * Listens to Lexical editor state changes with a debounced computation.
 */
export default function EditorStatusBar({ zoom }: EditorStatusBarProps) {
  const [editor] = useLexicalComposerContext();
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [script, setScript] = useState<DetectedScript>('None');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const computeStats = useCallback(() => {
    editor.getEditorState().read(() => {
      const root = $getRoot();
      const text = root.getTextContent();

      // Character count (excluding leading/trailing whitespace per the full text)
      setCharCount(text.length);

      // Word count — split on whitespace, filter empty strings
      const words = text.split(/\s+/).filter((w) => w.length > 0);
      setWordCount(words.length);

      // Script detection
      setScript(detectScript(text));
    });
  }, [editor]);

  useEffect(() => {
    // Compute initial stats
    computeStats();

    // Subscribe to editor state changes with debounce
    const unregister = editor.registerUpdateListener(() => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(computeStats, 300);
    });

    return () => {
      unregister();
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [editor, computeStats]);

  const zoomPercentage = Math.round(zoom * 100);

  return (
    <Group gap="xs" wrap="nowrap">
      <Text size="xs" c="dimmed">
        Words: {formatNumber(wordCount)}
      </Text>
      <Divider orientation="vertical" />
      <Text size="xs" c="dimmed">
        Characters: {formatNumber(charCount)}
      </Text>
      <Divider orientation="vertical" />
      <Text size="xs" c="dimmed">
        Script: {script}
      </Text>
      <Divider orientation="vertical" />
      <Text size="xs" c="dimmed">
        Zoom: {zoomPercentage}%
      </Text>
    </Group>
  );
}
