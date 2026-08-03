import { useCallback, type ReactNode } from 'react';
import { ActionIcon, Divider, Group, Menu, Select, Tooltip } from '@mantine/core';
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconBold,
  IconItalic,
  IconUnderline,
  IconStrikethrough,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconAlignJustified,
  IconLink,
  IconPhoto,
  IconDots,
} from '@tabler/icons-react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
} from 'lexical';
import { $createHeadingNode, type HeadingTagType } from '@lexical/rich-text';
import { $createParagraphNode, $getSelection, $isRangeSelection } from 'lexical';
import { $setBlocksType } from '@lexical/selection';
import { INSERT_LINK_COMMAND } from './plugins/LinkPlugin';
import { INSERT_IMAGE_COMMAND } from './plugins/ImagePlugin';

export interface EditorToolbarProps {
  activeFormats: {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strikethrough: boolean;
  };
  blockType: string; // 'paragraph' | 'h1' | 'h2' | ... | 'h6'
  canUndo: boolean;
  canRedo: boolean;
  currentFont: string;
  onFontChange: (font: string) => void;
  /** When true, collapses less-used groups into an overflow menu (for mobile/small screens) */
  compact?: boolean;
  /** Additional toolbar items to render in the overflow menu when compact */
  overflowItems?: ReactNode;
}

const BLOCK_TYPE_OPTIONS = [
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
  { value: 'h4', label: 'Heading 4' },
  { value: 'h5', label: 'Heading 5' },
  { value: 'h6', label: 'Heading 6' },
];

const FONT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: 'Courier New, monospace', label: 'Courier New' },
  { value: 'Noto Naskh Arabic, serif', label: 'Noto Naskh Arabic' },
  { value: 'Noto Sans Devanagari, sans-serif', label: 'Noto Sans Devanagari' },
];

/**
 * Editor toolbar with history, block type selector, inline formatting, and alignment controls.
 * Accepts active state as props (synced by ToolbarPlugin).
 * When `compact` is true (mobile), only History + Inline format are shown directly;
 * Block type, Alignment, Font, and any overflowItems go into a "More" menu.
 */
export default function EditorToolbar({
  activeFormats,
  blockType,
  canUndo,
  canRedo,
  currentFont,
  onFontChange,
  compact = false,
  overflowItems,
}: EditorToolbarProps) {
  const [editor] = useLexicalComposerContext();

  const handleUndo = useCallback(() => {
    editor.dispatchCommand(UNDO_COMMAND, undefined);
  }, [editor]);

  const handleRedo = useCallback(() => {
    editor.dispatchCommand(REDO_COMMAND, undefined);
  }, [editor]);

  const handleFormatText = useCallback(
    (format: 'bold' | 'italic' | 'underline' | 'strikethrough') => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    },
    [editor],
  );

  const handleAlign = useCallback(
    (alignment: 'left' | 'center' | 'right' | 'justify') => {
      editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignment);
    },
    [editor],
  );

  const handleBlockTypeChange = useCallback(
    (value: string | null) => {
      if (!value) return;

      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        if (value === 'paragraph') {
          $setBlocksType(selection, () => $createParagraphNode());
        } else {
          const tag = value as HeadingTagType;
          $setBlocksType(selection, () => $createHeadingNode(tag));
        }
      });
    },
    [editor],
  );

  const handleInsertLink = useCallback(() => {
    editor.dispatchCommand(INSERT_LINK_COMMAND, undefined);
  }, [editor]);

  const handleInsertImage = useCallback(() => {
    editor.dispatchCommand(INSERT_IMAGE_COMMAND, { showDialog: true });
  }, [editor]);

  // Block type selector (used inline on desktop, in overflow on mobile)
  const blockTypeSelector = (
    <Select
      size="xs"
      value={blockType}
      onChange={handleBlockTypeChange}
      data={BLOCK_TYPE_OPTIONS}
      w={120}
      aria-label="Block type"
      comboboxProps={{ withinPortal: true }}
    />
  );

  // Alignment buttons group (used inline on desktop, in overflow on mobile)
  const alignmentButtons = (
    <Group gap={2} wrap="nowrap" role="group" aria-label="Text alignment">
      <Tooltip label="Align left" position="bottom" withArrow>
        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={() => handleAlign('left')}
          aria-label="Align left"
        >
          <IconAlignLeft size={16} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Align center" position="bottom" withArrow>
        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={() => handleAlign('center')}
          aria-label="Align center"
        >
          <IconAlignCenter size={16} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Align right" position="bottom" withArrow>
        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={() => handleAlign('right')}
          aria-label="Align right"
        >
          <IconAlignRight size={16} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Justify" position="bottom" withArrow>
        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={() => handleAlign('justify')}
          aria-label="Justify"
        >
          <IconAlignJustified size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );

  // Font selector (used inline on desktop, in overflow on mobile)
  const fontSelector = (
    <Select
      size="xs"
      value={currentFont}
      onChange={(value) => onFontChange(value || '')}
      data={FONT_OPTIONS}
      w={160}
      aria-label="Font family"
      comboboxProps={{ withinPortal: true }}
      placeholder="Font"
    />
  );

  // Compact/mobile layout: History + Inline + overflow menu
  if (compact) {
    return (
      <Group gap="xs" wrap="nowrap" role="toolbar" aria-label="Text formatting toolbar">
        {/* History group */}
        <Group gap={2} wrap="nowrap" role="group" aria-label="History">
          <Tooltip label="Undo" position="bottom" withArrow>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={handleUndo}
              disabled={!canUndo}
              aria-label="Undo"
            >
              <IconArrowBackUp size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Redo" position="bottom" withArrow>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={handleRedo}
              disabled={!canRedo}
              aria-label="Redo"
            >
              <IconArrowForwardUp size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Divider orientation="vertical" />

        {/* Inline format buttons */}
        <Group gap={2} wrap="nowrap" role="group" aria-label="Inline formatting">
          <Tooltip label="Bold" position="bottom" withArrow>
            <ActionIcon
              variant={activeFormats.bold ? 'filled' : 'subtle'}
              size="sm"
              onClick={() => handleFormatText('bold')}
              aria-label="Bold"
              aria-pressed={activeFormats.bold}
            >
              <IconBold size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Italic" position="bottom" withArrow>
            <ActionIcon
              variant={activeFormats.italic ? 'filled' : 'subtle'}
              size="sm"
              onClick={() => handleFormatText('italic')}
              aria-label="Italic"
              aria-pressed={activeFormats.italic}
            >
              <IconItalic size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Underline" position="bottom" withArrow>
            <ActionIcon
              variant={activeFormats.underline ? 'filled' : 'subtle'}
              size="sm"
              onClick={() => handleFormatText('underline')}
              aria-label="Underline"
              aria-pressed={activeFormats.underline}
            >
              <IconUnderline size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Strikethrough" position="bottom" withArrow>
            <ActionIcon
              variant={activeFormats.strikethrough ? 'filled' : 'subtle'}
              size="sm"
              onClick={() => handleFormatText('strikethrough')}
              aria-label="Strikethrough"
              aria-pressed={activeFormats.strikethrough}
            >
              <IconStrikethrough size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Insert link" position="bottom" withArrow>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={handleInsertLink}
              aria-label="Insert link"
            >
              <IconLink size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Insert image" position="bottom" withArrow>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={handleInsertImage}
              aria-label="Insert image"
            >
              <IconPhoto size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Divider orientation="vertical" />

        {/* Overflow "More" menu */}
        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <Tooltip label="More options" position="bottom" withArrow>
              <ActionIcon
                variant="subtle"
                size="sm"
                aria-label="More toolbar options"
                aria-haspopup="menu"
              >
                <IconDots size={16} />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Block type</Menu.Label>
            <Menu.Item closeMenuOnClick={false}>{blockTypeSelector}</Menu.Item>
            <Menu.Divider />
            <Menu.Label>Alignment</Menu.Label>
            <Menu.Item closeMenuOnClick={false}>{alignmentButtons}</Menu.Item>
            <Menu.Divider />
            <Menu.Label>Font</Menu.Label>
            <Menu.Item closeMenuOnClick={false}>{fontSelector}</Menu.Item>
            {overflowItems && (
              <>
                <Menu.Divider />
                <Menu.Label>More tools</Menu.Label>
                {overflowItems}
              </>
            )}
          </Menu.Dropdown>
        </Menu>
      </Group>
    );
  }

  // Desktop layout: full toolbar
  return (
    <Group gap="xs" wrap="nowrap" role="toolbar" aria-label="Text formatting toolbar">
      {/* History group */}
      <Group gap={2} wrap="nowrap" role="group" aria-label="History">
        <Tooltip label="Undo" position="bottom" withArrow>
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={handleUndo}
            disabled={!canUndo}
            aria-label="Undo"
          >
            <IconArrowBackUp size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Redo" position="bottom" withArrow>
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={handleRedo}
            disabled={!canRedo}
            aria-label="Redo"
          >
            <IconArrowForwardUp size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Divider orientation="vertical" />

      {/* Block type selector */}
      <Group gap={2} wrap="nowrap" role="group" aria-label="Block type">
        {blockTypeSelector}
      </Group>

      <Divider orientation="vertical" />

      {/* Inline format buttons */}
      <Group gap={2} wrap="nowrap" role="group" aria-label="Inline formatting">
        <Tooltip label="Bold" position="bottom" withArrow>
          <ActionIcon
            variant={activeFormats.bold ? 'filled' : 'subtle'}
            size="sm"
            onClick={() => handleFormatText('bold')}
            aria-label="Bold"
            aria-pressed={activeFormats.bold}
          >
            <IconBold size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Italic" position="bottom" withArrow>
          <ActionIcon
            variant={activeFormats.italic ? 'filled' : 'subtle'}
            size="sm"
            onClick={() => handleFormatText('italic')}
            aria-label="Italic"
            aria-pressed={activeFormats.italic}
          >
            <IconItalic size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Underline" position="bottom" withArrow>
          <ActionIcon
            variant={activeFormats.underline ? 'filled' : 'subtle'}
            size="sm"
            onClick={() => handleFormatText('underline')}
            aria-label="Underline"
            aria-pressed={activeFormats.underline}
          >
            <IconUnderline size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Strikethrough" position="bottom" withArrow>
          <ActionIcon
            variant={activeFormats.strikethrough ? 'filled' : 'subtle'}
            size="sm"
            onClick={() => handleFormatText('strikethrough')}
            aria-label="Strikethrough"
            aria-pressed={activeFormats.strikethrough}
          >
            <IconStrikethrough size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Insert link" position="bottom" withArrow>
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={handleInsertLink}
            aria-label="Insert link"
          >
            <IconLink size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Insert image" position="bottom" withArrow>
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={handleInsertImage}
            aria-label="Insert image"
          >
            <IconPhoto size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Divider orientation="vertical" />

      {/* Alignment buttons */}
      <Group gap={2} wrap="nowrap" role="group" aria-label="Text alignment">
        {alignmentButtons}
      </Group>

      <Divider orientation="vertical" />

      {/* Document group — Font selector */}
      <Group gap={2} wrap="nowrap" role="group" aria-label="Document settings">
        {fontSelector}
      </Group>
    </Group>
  );
}
