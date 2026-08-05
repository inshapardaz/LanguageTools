import { useCallback, useMemo, type ReactNode } from 'react';
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
import { useI18n } from '../../i18n';

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
  const { t } = useI18n();

  const BLOCK_TYPE_OPTIONS = useMemo(() => [
    { value: 'paragraph', label: t('blockParagraph') },
    { value: 'h1', label: t('blockH1') },
    { value: 'h2', label: t('blockH2') },
    { value: 'h3', label: t('blockH3') },
    { value: 'h4', label: t('blockH4') },
    { value: 'h5', label: t('blockH5') },
    { value: 'h6', label: t('blockH6') },
  ], [t]);

  const FONT_OPTIONS = useMemo(() => [
    { value: '', label: t('fontDefault') },
    { value: 'Arial, sans-serif', label: 'Arial' },
    { value: 'Times New Roman, serif', label: 'Times New Roman' },
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: 'Verdana, sans-serif', label: 'Verdana' },
    { value: 'Courier New, monospace', label: 'Courier New' },
    { value: 'Noto Naskh Arabic, serif', label: 'Noto Naskh Arabic' },
    { value: 'Noto Sans Devanagari, sans-serif', label: 'Noto Sans Devanagari' },
  ], [t]);

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
      aria-label={t('toolbarBlockTypeLabel')}
      comboboxProps={{ withinPortal: true }}
    />
  );

  // Alignment buttons group (used inline on desktop, in overflow on mobile)
  const alignmentButtons = (
    <Group gap={2} wrap="nowrap" role="group" aria-label={t('toolbarTextAlignment')}>
      <Tooltip label={t('toolbarAlignLeft')} position="bottom" withArrow>
        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={() => handleAlign('left')}
          aria-label={t('toolbarAlignLeft')}
        >
          <IconAlignLeft size={16} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t('toolbarAlignCenter')} position="bottom" withArrow>
        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={() => handleAlign('center')}
          aria-label={t('toolbarAlignCenter')}
        >
          <IconAlignCenter size={16} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t('toolbarAlignRight')} position="bottom" withArrow>
        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={() => handleAlign('right')}
          aria-label={t('toolbarAlignRight')}
        >
          <IconAlignRight size={16} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t('toolbarJustify')} position="bottom" withArrow>
        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={() => handleAlign('justify')}
          aria-label={t('toolbarJustify')}
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
      aria-label={t('toolbarFontLabel')}
      comboboxProps={{ withinPortal: true }}
      placeholder={t('toolbarFont')}
    />
  );

  // Compact/mobile layout: History + Inline + overflow menu
  if (compact) {
    return (
      <Group gap="xs" wrap="nowrap" role="toolbar" aria-label={t('toolbarLabel')}>
        {/* History group */}
        <Group gap={2} wrap="nowrap" role="group" aria-label={t('toolbarHistory')}>
          <Tooltip label={t('toolbarUndo')} position="bottom" withArrow>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={handleUndo}
              disabled={!canUndo}
              aria-label={t('toolbarUndo')}
            >
              <IconArrowBackUp size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t('toolbarRedo')} position="bottom" withArrow>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={handleRedo}
              disabled={!canRedo}
              aria-label={t('toolbarRedo')}
            >
              <IconArrowForwardUp size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Divider orientation="vertical" />

        {/* Inline format buttons */}
        <Group gap={2} wrap="nowrap" role="group" aria-label={t('toolbarInlineFormatting')}>
          <Tooltip label={t('toolbarBold')} position="bottom" withArrow>
            <ActionIcon
              variant={activeFormats.bold ? 'filled' : 'subtle'}
              size="sm"
              onClick={() => handleFormatText('bold')}
              aria-label={t('toolbarBold')}
              aria-pressed={activeFormats.bold}
            >
              <IconBold size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t('toolbarItalic')} position="bottom" withArrow>
            <ActionIcon
              variant={activeFormats.italic ? 'filled' : 'subtle'}
              size="sm"
              onClick={() => handleFormatText('italic')}
              aria-label={t('toolbarItalic')}
              aria-pressed={activeFormats.italic}
            >
              <IconItalic size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t('toolbarUnderline')} position="bottom" withArrow>
            <ActionIcon
              variant={activeFormats.underline ? 'filled' : 'subtle'}
              size="sm"
              onClick={() => handleFormatText('underline')}
              aria-label={t('toolbarUnderline')}
              aria-pressed={activeFormats.underline}
            >
              <IconUnderline size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t('toolbarStrikethrough')} position="bottom" withArrow>
            <ActionIcon
              variant={activeFormats.strikethrough ? 'filled' : 'subtle'}
              size="sm"
              onClick={() => handleFormatText('strikethrough')}
              aria-label={t('toolbarStrikethrough')}
              aria-pressed={activeFormats.strikethrough}
            >
              <IconStrikethrough size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t('toolbarInsertLink')} position="bottom" withArrow>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={handleInsertLink}
              aria-label={t('toolbarInsertLink')}
            >
              <IconLink size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t('toolbarInsertImage')} position="bottom" withArrow>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={handleInsertImage}
              aria-label={t('toolbarInsertImage')}
            >
              <IconPhoto size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Divider orientation="vertical" />

        {/* Overflow "More" menu */}
        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <Tooltip label={t('toolbarMoreOptions')} position="bottom" withArrow>
              <ActionIcon
                variant="subtle"
                size="sm"
                aria-label={t('toolbarMoreOptions')}
                aria-haspopup="menu"
              >
                <IconDots size={16} />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>{t('toolbarBlockType')}</Menu.Label>
            <Menu.Item closeMenuOnClick={false}>{blockTypeSelector}</Menu.Item>
            <Menu.Divider />
            <Menu.Label>{t('toolbarAlignment')}</Menu.Label>
            <Menu.Item closeMenuOnClick={false}>{alignmentButtons}</Menu.Item>
            <Menu.Divider />
            <Menu.Label>{t('toolbarFont')}</Menu.Label>
            <Menu.Item closeMenuOnClick={false}>{fontSelector}</Menu.Item>
            {overflowItems && (
              <>
                <Menu.Divider />
                <Menu.Label>{t('toolbarMoreTools')}</Menu.Label>
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
    <Group gap="xs" wrap="nowrap" role="toolbar" aria-label={t('toolbarLabel')}>
      {/* History group */}
      <Group gap={2} wrap="nowrap" role="group" aria-label={t('toolbarHistory')}>
        <Tooltip label={t('toolbarUndo')} position="bottom" withArrow>
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={handleUndo}
            disabled={!canUndo}
            aria-label={t('toolbarUndo')}
          >
            <IconArrowBackUp size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t('toolbarRedo')} position="bottom" withArrow>
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={handleRedo}
            disabled={!canRedo}
            aria-label={t('toolbarRedo')}
          >
            <IconArrowForwardUp size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Divider orientation="vertical" />

      {/* Block type selector */}
      <Group gap={2} wrap="nowrap" role="group" aria-label={t('toolbarBlockType')}>
        {blockTypeSelector}
      </Group>

      <Divider orientation="vertical" />

      {/* Inline format buttons */}
      <Group gap={2} wrap="nowrap" role="group" aria-label={t('toolbarInlineFormatting')}>
        <Tooltip label={t('toolbarBold')} position="bottom" withArrow>
          <ActionIcon
            variant={activeFormats.bold ? 'filled' : 'subtle'}
            size="sm"
            onClick={() => handleFormatText('bold')}
            aria-label={t('toolbarBold')}
            aria-pressed={activeFormats.bold}
          >
            <IconBold size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t('toolbarItalic')} position="bottom" withArrow>
          <ActionIcon
            variant={activeFormats.italic ? 'filled' : 'subtle'}
            size="sm"
            onClick={() => handleFormatText('italic')}
            aria-label={t('toolbarItalic')}
            aria-pressed={activeFormats.italic}
          >
            <IconItalic size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t('toolbarUnderline')} position="bottom" withArrow>
          <ActionIcon
            variant={activeFormats.underline ? 'filled' : 'subtle'}
            size="sm"
            onClick={() => handleFormatText('underline')}
            aria-label={t('toolbarUnderline')}
            aria-pressed={activeFormats.underline}
          >
            <IconUnderline size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t('toolbarStrikethrough')} position="bottom" withArrow>
          <ActionIcon
            variant={activeFormats.strikethrough ? 'filled' : 'subtle'}
            size="sm"
            onClick={() => handleFormatText('strikethrough')}
            aria-label={t('toolbarStrikethrough')}
            aria-pressed={activeFormats.strikethrough}
          >
            <IconStrikethrough size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t('toolbarInsertLink')} position="bottom" withArrow>
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={handleInsertLink}
            aria-label={t('toolbarInsertLink')}
          >
            <IconLink size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t('toolbarInsertImage')} position="bottom" withArrow>
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={handleInsertImage}
            aria-label={t('toolbarInsertImage')}
          >
            <IconPhoto size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Divider orientation="vertical" />

      {/* Alignment buttons */}
      <Group gap={2} wrap="nowrap" role="group" aria-label={t('toolbarTextAlignment')}>
        {alignmentButtons}
      </Group>

      <Divider orientation="vertical" />

      {/* Document group — Font selector */}
      <Group gap={2} wrap="nowrap" role="group" aria-label={t('toolbarDocumentSettings')}>
        {fontSelector}
      </Group>
    </Group>
  );
}
