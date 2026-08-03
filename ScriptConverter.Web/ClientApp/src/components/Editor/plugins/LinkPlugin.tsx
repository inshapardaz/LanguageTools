import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionIcon,
  Button,
  Checkbox,
  Group,
  Paper,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { AutoLinkPlugin, createLinkMatcherWithRegExp } from '@lexical/react/LexicalAutoLinkPlugin';
import {
  $isLinkNode,
  TOGGLE_LINK_COMMAND,
  LinkNode,
} from '@lexical/link';
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  createCommand,
  type LexicalCommand,
  type RangeSelection,
} from 'lexical';

/**
 * Custom command to open the link insert/edit modal from toolbar.
 */
export const INSERT_LINK_COMMAND: LexicalCommand<undefined> =
  createCommand('INSERT_LINK_COMMAND');

// URL regex patterns for auto-link detection
const URL_REGEX =
  /((https?:\/\/(www\.)?|www\.)[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*))/;

const EMAIL_REGEX =
  /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;

const URL_MATCHERS = [
  createLinkMatcherWithRegExp(URL_REGEX, (text) => {
    return text.startsWith('http') ? text : `https://${text}`;
  }),
  createLinkMatcherWithRegExp(EMAIL_REGEX, (text) => {
    return `mailto:${text}`;
  }),
];

/**
 * Helper to get the selected link node from the current selection.
 */
function getSelectedLinkNode(selection: RangeSelection): LinkNode | null {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();

  // Check if the anchor node's parent is a link
  const anchorParent = anchorNode.getParent();
  if ($isLinkNode(anchorParent)) {
    return anchorParent;
  }

  // Check if the focus node's parent is a link
  const focusParent = focusNode.getParent();
  if ($isLinkNode(focusParent)) {
    return focusParent;
  }

  // Check if anchor node itself is a link
  if ($isLinkNode(anchorNode)) {
    return anchorNode;
  }

  return null;
}

/**
 * Helper to get the text content from a selection.
 */
function getSelectionText(selection: RangeSelection): string {
  return selection.getTextContent();
}

/**
 * FloatingLinkEditor — appears when the cursor is inside a link or when inserting a new link.
 */
function FloatingLinkEditor() {
  const [editor] = useLexicalComposerContext();
  const editorRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [openInNewTab, setOpenInNewTab] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: -9999,
    left: -9999,
  });

  const updatePosition = useCallback(() => {
    const nativeSelection = window.getSelection();
    if (!nativeSelection || nativeSelection.rangeCount === 0) {
      return;
    }
    const range = nativeSelection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Position below the selection
    const editorElement = editor.getRootElement();
    if (!editorElement) return;

    const editorRect = editorElement.getBoundingClientRect();
    setPosition({
      top: rect.bottom - editorRect.top + 8,
      left: rect.left - editorRect.left,
    });
  }, [editor]);

  const openEditor = useCallback(
    (editUrl: string, editText: string, editing: boolean) => {
      setUrl(editUrl);
      setLinkText(editText);
      setIsEditMode(editing);
      setIsOpen(true);
      // Delay position calculation to next frame to allow DOM to settle
      requestAnimationFrame(() => {
        updatePosition();
      });
    },
    [updatePosition],
  );

  const closeEditor = useCallback(() => {
    setIsOpen(false);
    setUrl('');
    setLinkText('');
    setIsEditMode(false);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!url.trim()) return;

    const finalUrl = url.startsWith('http') || url.startsWith('mailto:')
      ? url
      : `https://${url}`;

    editor.dispatchCommand(TOGGLE_LINK_COMMAND, {
      url: finalUrl,
      target: openInNewTab ? '_blank' : undefined,
      rel: openInNewTab ? 'noopener noreferrer' : undefined,
    });

    closeEditor();
  }, [editor, url, openInNewTab, closeEditor]);

  const handleRemove = useCallback(() => {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    closeEditor();
  }, [editor, closeEditor]);

  // Register the INSERT_LINK_COMMAND
  useEffect(() => {
    return editor.registerCommand(
      INSERT_LINK_COMMAND,
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return false;

        const linkNode = getSelectedLinkNode(selection);
        if (linkNode) {
          // Editing an existing link
          const existingUrl = linkNode.getURL();
          const existingTarget = linkNode.getTarget();
          const text = linkNode.getTextContent();
          setOpenInNewTab(existingTarget === '_blank');
          openEditor(existingUrl, text, true);
        } else {
          // Inserting a new link
          const selectedText = getSelectionText(selection);
          setOpenInNewTab(true);
          openEditor('', selectedText, false);
        }
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, openEditor]);

  // Listen for selection changes — show edit UI when cursor is inside a link
  useEffect(() => {
    const unregister = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return;
        }

        // If the floating editor is already open from a toolbar action, don't override
        if (isOpen) return;

        const linkNode = getSelectedLinkNode(selection);
        if (linkNode && !isOpen) {
          // Don't auto-open, just prepare state for if the user clicks the toolbar button
        }
      });
    });
    return unregister;
  }, [editor, isOpen]);

  if (!isOpen) return null;

  return (
    <Paper
      ref={editorRef}
      shadow="md"
      p="sm"
      withBorder
      className="floating-link-editor"
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        zIndex: 100,
        minWidth: 320,
      }}
      aria-label="Link editor"
      role="dialog"
    >
      <TextInput
        label="URL"
        placeholder="https://example.com"
        value={url}
        onChange={(e) => setUrl(e.currentTarget.value)}
        size="sm"
        mb="xs"
        aria-label="Link URL"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            closeEditor();
          }
        }}
      />
      <TextInput
        label="Text (optional)"
        placeholder="Link text"
        value={linkText}
        onChange={(e) => setLinkText(e.currentTarget.value)}
        size="sm"
        mb="xs"
        aria-label="Link text"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            closeEditor();
          }
        }}
      />
      <Checkbox
        label="Open in new tab"
        checked={openInNewTab}
        onChange={(e) => setOpenInNewTab(e.currentTarget.checked)}
        size="sm"
        mb="sm"
        aria-label="Open link in new tab"
      />
      <Group justify="space-between">
        <Group gap="xs">
          <Button size="xs" onClick={handleSubmit} disabled={!url.trim()}>
            {isEditMode ? 'Update' : 'Insert'}
          </Button>
          <Button size="xs" variant="subtle" onClick={closeEditor}>
            Cancel
          </Button>
        </Group>
        {isEditMode && (
          <Tooltip label="Remove link" position="bottom" withArrow>
            <ActionIcon
              variant="subtle"
              color="red"
              size="sm"
              onClick={handleRemove}
              aria-label="Remove link"
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
    </Paper>
  );
}

/**
 * LinkPlugin provides:
 * 1. A floating link editor for inserting/editing links
 * 2. Auto-detection of URLs and emails via AutoLinkPlugin
 * 3. A toolbar button export (via INSERT_LINK_COMMAND)
 */
export default function LinkPlugin() {
  return (
    <>
      <FloatingLinkEditor />
      <AutoLinkPlugin matchers={URL_MATCHERS} />
    </>
  );
}
