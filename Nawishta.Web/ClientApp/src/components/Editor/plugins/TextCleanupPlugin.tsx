import { useCallback } from 'react';
import { ActionIcon, Menu, Tooltip } from '@mantine/core';
import {
  IconClearFormatting,
  IconTextWrap,
  IconSpacingVertical,
  IconIndentDecrease,
  IconRowRemove,
} from '@tabler/icons-react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isElementNode,
  $createParagraphNode,
  $createTextNode,
  createCommand,
  COMMAND_PRIORITY_LOW,
  type LexicalCommand,
  type ElementNode,
} from 'lexical';
import { useEffect } from 'react';
import { useI18n } from '../../../i18n';

// --- Exported Commands ---

/** Command to join lines within the selection (merge paragraphs). */
export const JOIN_LINES_COMMAND: LexicalCommand<undefined> =
  createCommand('JOIN_LINES_COMMAND');

/** Command to collapse multiple consecutive spaces into a single space. */
export const REMOVE_MULTIPLE_SPACES_COMMAND: LexicalCommand<undefined> =
  createCommand('REMOVE_MULTIPLE_SPACES_COMMAND');

/** Command to trim leading/trailing whitespace from paragraphs. */
export const TRIM_PARAGRAPHS_COMMAND: LexicalCommand<undefined> =
  createCommand('TRIM_PARAGRAPHS_COMMAND');

/** Command to remove empty/whitespace-only paragraphs. */
export const REMOVE_EMPTY_PARAGRAPHS_COMMAND: LexicalCommand<undefined> =
  createCommand('REMOVE_EMPTY_PARAGRAPHS_COMMAND');

// --- Helper functions ---

/**
 * Get the paragraph-level element nodes that are selected,
 * or all root children if no range selection exists.
 */
function getTargetParagraphs(): ElementNode[] {
  const selection = $getSelection();

  if ($isRangeSelection(selection)) {
    const nodes = selection.getNodes();
    const paragraphs = new Set<ElementNode>();

    for (const node of nodes) {
      const topLevel = node.getTopLevelElementOrThrow();
      if ($isElementNode(topLevel)) {
        paragraphs.add(topLevel);
      }
    }
    return Array.from(paragraphs);
  }

  // No selection — operate on entire document
  const root = $getRoot();
  return root.getChildren().filter($isElementNode);
}

/**
 * Join multiple paragraph nodes into a single paragraph,
 * concatenating their text content with spaces.
 */
function joinLines(): void {
  const paragraphs = getTargetParagraphs();
  if (paragraphs.length <= 1) return;

  // Create a new paragraph with the combined text
  const combinedText = paragraphs.map((p) => p.getTextContent()).join(' ');
  const newParagraph = $createParagraphNode();
  newParagraph.append($createTextNode(combinedText));

  // Insert the new paragraph before the first one
  paragraphs[0].insertBefore(newParagraph);

  // Remove the original paragraphs
  for (const p of paragraphs) {
    p.remove();
  }
}

/**
 * Collapse multiple consecutive spaces into single spaces
 * within the target paragraphs.
 */
function removeMultipleSpaces(): void {
  const paragraphs = getTargetParagraphs();

  for (const paragraph of paragraphs) {
    const textNodes = paragraph.getAllTextNodes();
    for (const textNode of textNodes) {
      const text = textNode.getTextContent();
      const cleaned = text.replace(/ {2,}/g, ' ');
      if (cleaned !== text) {
        textNode.setTextContent(cleaned);
      }
    }
  }
}

/**
 * Trim leading and trailing whitespace from each paragraph node.
 */
function trimParagraphs(): void {
  const paragraphs = getTargetParagraphs();

  for (const paragraph of paragraphs) {
    const textNodes = paragraph.getAllTextNodes();
    if (textNodes.length === 0) continue;

    // Trim leading whitespace from the first text node
    const firstNode = textNodes[0];
    const firstText = firstNode.getTextContent();
    const trimmedStart = firstText.replace(/^\s+/, '');
    if (trimmedStart !== firstText) {
      firstNode.setTextContent(trimmedStart);
    }

    // Trim trailing whitespace from the last text node
    const lastNode = textNodes[textNodes.length - 1];
    const lastText = lastNode.getTextContent();
    const trimmedEnd = lastText.replace(/\s+$/, '');
    if (trimmedEnd !== lastText) {
      lastNode.setTextContent(trimmedEnd);
    }
  }
}

/**
 * Remove paragraph nodes that are empty or contain only whitespace.
 */
function removeEmptyParagraphs(): void {
  const root = $getRoot();
  const children = root.getChildren();

  for (const child of children) {
    if (!$isElementNode(child)) continue;

    const text = child.getTextContent();
    if (text.trim() === '') {
      // Don't remove the last remaining paragraph
      if (root.getChildrenSize() > 1) {
        child.remove();
      }
    }
  }
}

// --- Plugin Component ---

/**
 * TextCleanupPlugin provides text cleanup actions as a dropdown menu:
 * - Join lines: merge selected paragraphs into one
 * - Remove multiple spaces: collapse consecutive spaces
 * - Trim paragraphs: remove leading/trailing whitespace
 * - Remove empty paragraphs: delete blank paragraphs
 *
 * All actions integrate with HistoryPlugin (undo/redo) via editor.update().
 */
export default function TextCleanupPlugin() {
  const [editor] = useLexicalComposerContext();
  const { t } = useI18n();

  // Register commands
  useEffect(() => {
    const unregisterJoin = editor.registerCommand(
      JOIN_LINES_COMMAND,
      () => {
        editor.update(() => {
          joinLines();
        });
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );

    const unregisterSpaces = editor.registerCommand(
      REMOVE_MULTIPLE_SPACES_COMMAND,
      () => {
        editor.update(() => {
          removeMultipleSpaces();
        });
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );

    const unregisterTrim = editor.registerCommand(
      TRIM_PARAGRAPHS_COMMAND,
      () => {
        editor.update(() => {
          trimParagraphs();
        });
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );

    const unregisterEmpty = editor.registerCommand(
      REMOVE_EMPTY_PARAGRAPHS_COMMAND,
      () => {
        editor.update(() => {
          removeEmptyParagraphs();
        });
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );

    return () => {
      unregisterJoin();
      unregisterSpaces();
      unregisterTrim();
      unregisterEmpty();
    };
  }, [editor]);

  const handleJoinLines = useCallback(() => {
    editor.dispatchCommand(JOIN_LINES_COMMAND, undefined);
  }, [editor]);

  const handleRemoveSpaces = useCallback(() => {
    editor.dispatchCommand(REMOVE_MULTIPLE_SPACES_COMMAND, undefined);
  }, [editor]);

  const handleTrimParagraphs = useCallback(() => {
    editor.dispatchCommand(TRIM_PARAGRAPHS_COMMAND, undefined);
  }, [editor]);

  const handleRemoveEmptyParagraphs = useCallback(() => {
    editor.dispatchCommand(REMOVE_EMPTY_PARAGRAPHS_COMMAND, undefined);
  }, [editor]);

  return (
    <Menu position="bottom-start" withinPortal={false}>
      <Menu.Target>
        <Tooltip label={t('textEditorCleanup')} position="bottom" withArrow>
          <ActionIcon variant="subtle" size="sm" aria-label={t('textEditorCleanup')} aria-haspopup="menu">
            <IconClearFormatting size={16} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconTextWrap size={14} />}
          onClick={handleJoinLines}
        >
          {t('textEditorJoinLines')}
        </Menu.Item>
        <Menu.Item
          leftSection={<IconSpacingVertical size={14} />}
          onClick={handleRemoveSpaces}
        >
          {t('textEditorRemoveSpaces')}
        </Menu.Item>
        <Menu.Item
          leftSection={<IconIndentDecrease size={14} />}
          onClick={handleTrimParagraphs}
        >
          {t('textEditorTrimWhiteSpaces')}
        </Menu.Item>
        <Menu.Item
          leftSection={<IconRowRemove size={14} />}
          onClick={handleRemoveEmptyParagraphs}
        >
          {t('textEditorRemoveEmpty')}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
