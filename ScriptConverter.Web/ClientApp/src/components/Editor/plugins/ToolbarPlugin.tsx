import { useCallback, useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  CAN_UNDO_COMMAND,
  CAN_REDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
} from 'lexical';
import { $isHeadingNode } from '@lexical/rich-text';
import { $isListNode, ListNode } from '@lexical/list';
import { $isCodeNode } from '@lexical/code';
import { $getNearestNodeOfType } from '@lexical/utils';

import type { ReactNode } from 'react';
import EditorToolbar from '../EditorToolbar';
import type { ParagraphDirection } from './RTLPlugin';

/**
 * ToolbarPlugin listens for Lexical editor state changes and syncs the
 * active formatting state (bold, italic, etc.), current block type, and
 * undo/redo availability to the EditorToolbar component.
 */
export default function ToolbarPlugin({
  currentFont,
  onFontChange,
  compact,
  overflowItems,
  currentDirection,
}: {
  currentFont: string;
  onFontChange: (font: string) => void;
  compact?: boolean;
  overflowItems?: ReactNode;
  currentDirection?: ParagraphDirection;
}) {
  const [editor] = useLexicalComposerContext();

  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
  });
  const [blockType, setBlockType] = useState<string>('paragraph');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateToolbarState = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;

    // Update inline format states
    setActiveFormats({
      bold: selection.hasFormat('bold'),
      italic: selection.hasFormat('italic'),
      underline: selection.hasFormat('underline'),
      strikethrough: selection.hasFormat('strikethrough'),
    });

    // Determine the current block type from the anchor node
    const anchorNode = selection.anchor.getNode();
    const element =
      anchorNode.getKey() === 'root'
        ? anchorNode
        : anchorNode.getTopLevelElementOrThrow();

    if ($isHeadingNode(element)) {
      setBlockType(element.getTag()); // 'h1', 'h2', ..., 'h6'
    } else if ($isListNode(element)) {
      const listType = element.getListType();
      setBlockType(listType === 'number' ? 'ol' : 'ul');
    } else if ($isCodeNode(element)) {
      setBlockType('code');
    } else {
      // Check if the anchor is inside a list item
      const listNode = $getNearestNodeOfType(anchorNode, ListNode);
      if (listNode) {
        const listType = listNode.getListType();
        setBlockType(listType === 'number' ? 'ol' : 'ul');
      } else {
        setBlockType(element.getType() === 'quote' ? 'quote' : 'paragraph');
      }
    }
  }, []);

  useEffect(() => {
    // Listen for editor state updates (selection changes, content changes)
    const unregisterUpdate = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbarState();
      });
    });

    // Listen for undo availability changes
    const unregisterCanUndo = editor.registerCommand(
      CAN_UNDO_COMMAND,
      (payload) => {
        setCanUndo(payload);
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );

    // Listen for redo availability changes
    const unregisterCanRedo = editor.registerCommand(
      CAN_REDO_COMMAND,
      (payload) => {
        setCanRedo(payload);
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );

    return () => {
      unregisterUpdate();
      unregisterCanUndo();
      unregisterCanRedo();
    };
  }, [editor, updateToolbarState]);

  return (
    <EditorToolbar
      activeFormats={activeFormats}
      blockType={blockType}
      canUndo={canUndo}
      canRedo={canRedo}
      currentFont={currentFont}
      onFontChange={onFontChange}
      currentDirection={currentDirection}
      compact={compact}
      overflowItems={overflowItems}
    />
  );
}
