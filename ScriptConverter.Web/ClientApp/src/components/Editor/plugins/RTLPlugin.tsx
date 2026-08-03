import { useCallback, useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ActionIcon, Divider, Group, Tooltip } from '@mantine/core';
import { IconTextDirectionLtr, IconTextDirectionRtl } from '@tabler/icons-react';
import {
  $getSelection,
  $isRangeSelection,
  $isElementNode,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  type LexicalCommand,
  type ElementNode,
} from 'lexical';
import { $getNearestBlockElementAncestorOrThrow } from '@lexical/utils';

export type ParagraphDirection = 'ltr' | 'rtl' | null;

/**
 * Command to set paragraph direction. Payload is 'ltr' | 'rtl'.
 */
export const SET_PARAGRAPH_DIRECTION_COMMAND: LexicalCommand<'ltr' | 'rtl'> =
  createCommand('SET_PARAGRAPH_DIRECTION_COMMAND');

/**
 * RTLPlugin provides per-paragraph direction toggling for mixed LTR/RTL documents.
 * It adds toolbar buttons to set the current paragraph's direction and syncs
 * the active direction state for display.
 */
export default function RTLPlugin() {
  const [editor] = useLexicalComposerContext();
  const [currentDirection, setCurrentDirection] = useState<ParagraphDirection>(null);

  // Sync the current paragraph direction from the selection
  const updateDirectionState = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;

    const anchorNode = selection.anchor.getNode();
    let element: ElementNode;

    if ($isElementNode(anchorNode)) {
      element = anchorNode;
    } else {
      const parent = anchorNode.getParent();
      if (parent && $isElementNode(parent)) {
        element = parent;
      } else {
        return;
      }
    }

    // Get the top-level block element if we're nested
    const topElement = anchorNode.getKey() === 'root'
      ? anchorNode
      : anchorNode.getTopLevelElementOrThrow();

    if ($isElementNode(topElement)) {
      const dir = topElement.getDirection();
      setCurrentDirection(dir);
    }
  }, []);

  useEffect(() => {
    // Listen for editor state updates to sync direction state
    const unregisterUpdate = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateDirectionState();
      });
    });

    // Register the set-direction command
    const unregisterCommand = editor.registerCommand(
      SET_PARAGRAPH_DIRECTION_COMMAND,
      (direction) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return false;

        const nodes = selection.getNodes();
        const processedElements = new Set<string>();

        for (const node of nodes) {
          let element: ElementNode | null = null;

          if ($isElementNode(node)) {
            element = node;
          } else {
            const parent = node.getParent();
            if (parent && $isElementNode(parent)) {
              element = parent;
            }
          }

          if (element) {
            // Get the top-level block element
            const topElement = node.getKey() === 'root'
              ? element
              : (() => {
                  try {
                    return $getNearestBlockElementAncestorOrThrow(node);
                  } catch {
                    return element;
                  }
                })();

            if ($isElementNode(topElement) && !processedElements.has(topElement.getKey())) {
              processedElements.add(topElement.getKey());
              topElement.setDirection(direction);
            }
          }
        }

        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );

    return () => {
      unregisterUpdate();
      unregisterCommand();
    };
  }, [editor, updateDirectionState]);

  const handleSetDirection = useCallback(
    (direction: 'ltr' | 'rtl') => {
      editor.dispatchCommand(SET_PARAGRAPH_DIRECTION_COMMAND, direction);
    },
    [editor],
  );

  return (
    <Group gap={2} wrap="nowrap">
      <Tooltip label="Left-to-right paragraph" position="bottom" withArrow>
        <ActionIcon
          variant={currentDirection === 'ltr' ? 'filled' : 'subtle'}
          size="sm"
          onClick={() => handleSetDirection('ltr')}
          aria-label="Left-to-right paragraph"
          aria-pressed={currentDirection === 'ltr'}
        >
          <IconTextDirectionLtr size={16} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Right-to-left paragraph" position="bottom" withArrow>
        <ActionIcon
          variant={currentDirection === 'rtl' ? 'filled' : 'subtle'}
          size="sm"
          onClick={() => handleSetDirection('rtl')}
          aria-label="Right-to-left paragraph"
          aria-pressed={currentDirection === 'rtl'}
        >
          <IconTextDirectionRtl size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
