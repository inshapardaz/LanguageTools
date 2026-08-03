import { useCallback, useState } from 'react';
import { ActionIcon, Menu, Tooltip, Loader } from '@mantine/core';
import { IconLanguage } from '@tabler/icons-react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $createTextNode,
  $createParagraphNode,
  createCommand,
  COMMAND_PRIORITY_LOW,
  type LexicalCommand,
} from 'lexical';
import { useEffect } from 'react';

// --- Types ---

interface TransliteratePayload {
  from: string;
  to: string;
}

interface TransliterationDirection {
  label: string;
  from: string;
  to: string;
}

// --- Exported Command ---

/** Command to transliterate text between scripts. */
export const TRANSLITERATE_COMMAND: LexicalCommand<TransliteratePayload> =
  createCommand('TRANSLITERATE_COMMAND');

// --- Direction options ---

const DIRECTIONS: TransliterationDirection[] = [
  { label: 'Roman → Urdu', from: 'Roman', to: 'UrduArabic' },
  { label: 'Roman → Hindi', from: 'Roman', to: 'HindiDevanagari' },
  { label: 'Urdu → Roman', from: 'UrduArabic', to: 'Roman' },
  { label: 'Urdu → Hindi', from: 'UrduArabic', to: 'HindiDevanagari' },
  { label: 'Hindi → Roman', from: 'HindiDevanagari', to: 'Roman' },
  { label: 'Hindi → Urdu', from: 'HindiDevanagari', to: 'UrduArabic' },
];

// --- Plugin Component ---

/**
 * TransliteratePlugin provides a toolbar dropdown for transliterating text
 * between scripts (Roman, Urdu, Hindi).
 *
 * - If text is selected, only the selection is transliterated.
 * - If no text is selected, the entire document is transliterated.
 * - Calls `/api/convert` endpoint with POST { text, from, to }.
 * - Replaces text with the result (with undo support via editor.update()).
 * - Shows a loading state while the API call is in progress.
 */
export default function TransliteratePlugin() {
  const [editor] = useLexicalComposerContext();
  const [loading, setLoading] = useState(false);

  // Register the transliterate command
  useEffect(() => {
    const unregister = editor.registerCommand(
      TRANSLITERATE_COMMAND,
      (payload: TransliteratePayload) => {
        handleTransliterate(payload.from, payload.to);
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );

    return unregister;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const handleTransliterate = useCallback(
    async (from: string, to: string) => {
      // Read the text to transliterate from the editor state
      let textToConvert = '';
      let hasSelection = false;

      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const selectedText = selection.getTextContent();
          if (selectedText.trim().length > 0) {
            textToConvert = selectedText;
            hasSelection = true;
            return;
          }
        }
        // No selection — get entire document text
        const root = $getRoot();
        textToConvert = root.getTextContent();
      });

      if (!textToConvert.trim()) return;

      setLoading(true);

      try {
        const res = await fetch('/api/convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textToConvert, from, to }),
        });

        if (!res.ok) {
          console.error('[TransliteratePlugin] API error:', res.status);
          return;
        }

        const data = await res.json();
        const result: string = data.result;

        if (!result) return;

        // Replace text in the editor (with undo support)
        editor.update(() => {
          if (hasSelection) {
            // Replace only the selected text
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              selection.insertRawText(result);
            }
          } else {
            // Replace entire document content
            const root = $getRoot();
            root.clear();
            // After clear, root is empty — add a paragraph with the result
            const paragraphs = result.split('\n');
            for (const paragraphText of paragraphs) {
              const paragraph = $createParagraphNode();
              paragraph.append($createTextNode(paragraphText));
              root.append(paragraph);
            }
          }
        });
      } catch (err) {
        console.error('[TransliteratePlugin] Failed to transliterate:', err);
      } finally {
        setLoading(false);
      }
    },
    [editor],
  );

  const handleDirectionClick = useCallback(
    (from: string, to: string) => {
      editor.dispatchCommand(TRANSLITERATE_COMMAND, { from, to });
    },
    [editor],
  );

  return (
    <Menu position="bottom-start" withinPortal={false}>
      <Menu.Target>
        <Tooltip label="Transliterate" position="bottom" withArrow>
          <ActionIcon
            variant="subtle"
            size="sm"
            aria-label="Transliterate"
            aria-haspopup="menu"
            loading={loading}
          >
            {loading ? <Loader size={14} /> : <IconLanguage size={16} />}
          </ActionIcon>
        </Tooltip>
      </Menu.Target>

      <Menu.Dropdown>
        {DIRECTIONS.map((dir) => (
          <Menu.Item
            key={`${dir.from}-${dir.to}`}
            onClick={() => handleDirectionClick(dir.from, dir.to)}
            disabled={loading}
          >
            {dir.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
