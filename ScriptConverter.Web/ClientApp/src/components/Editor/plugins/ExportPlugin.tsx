import { useCallback } from 'react';
import { ActionIcon, Menu, Tooltip } from '@mantine/core';
import { IconFileExport, IconFileTypeHtml, IconTxt, IconMarkdown } from '@tabler/icons-react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { exportAsHtml, exportAsPlainText, exportAsMarkdown } from '../utils/exportDocument';

/**
 * ExportPlugin provides a toolbar dropdown for exporting editor content
 * as HTML, plain text, or Markdown files.
 *
 * Uses Lexical's built-in HTML generation for HTML export,
 * root.getTextContent() for plain text, and a custom HTML-to-Markdown
 * converter for Markdown export.
 */
export default function ExportPlugin() {
  const [editor] = useLexicalComposerContext();

  const handleExportHtml = useCallback(() => {
    exportAsHtml(editor);
  }, [editor]);

  const handleExportText = useCallback(() => {
    exportAsPlainText(editor);
  }, [editor]);

  const handleExportMarkdown = useCallback(() => {
    exportAsMarkdown(editor);
  }, [editor]);

  return (
    <Menu position="bottom-start" withinPortal={false}>
      <Menu.Target>
        <Tooltip label="Export" position="bottom" withArrow>
          <ActionIcon variant="subtle" size="sm" aria-label="Export" aria-haspopup="menu">
            <IconFileExport size={16} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconFileTypeHtml size={14} />}
          onClick={handleExportHtml}
        >
          Export as HTML
        </Menu.Item>
        <Menu.Item
          leftSection={<IconTxt size={14} />}
          onClick={handleExportText}
        >
          Export as Plain Text
        </Menu.Item>
        <Menu.Item
          leftSection={<IconMarkdown size={14} />}
          onClick={handleExportMarkdown}
        >
          Export as Markdown
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
