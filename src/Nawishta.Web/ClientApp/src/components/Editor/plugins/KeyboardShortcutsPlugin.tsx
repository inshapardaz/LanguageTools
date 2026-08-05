import { useCallback, useEffect, useState } from 'react';
import { ActionIcon, Tooltip } from '@mantine/core';
import { IconKeyboard } from '@tabler/icons-react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { COMMAND_PRIORITY_HIGH, KEY_DOWN_COMMAND } from 'lexical';
import KeyboardShortcutsModal from '../KeyboardShortcutsModal';
import { useI18n } from '../../../i18n';

/**
 * Lexical plugin that registers Ctrl+/ (Cmd+/ on Mac) to open the keyboard
 * shortcuts help modal, and renders a toolbar button to trigger it manually.
 */
export default function KeyboardShortcutsPlugin() {
  const { t } = useI18n();
  const [editor] = useLexicalComposerContext();
  const [opened, setOpened] = useState(false);

  const open = useCallback(() => setOpened(true), []);
  const close = useCallback(() => setOpened(false), []);

  // Register Ctrl+/ keyboard shortcut via Lexical command system
  useEffect(() => {
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        if ((event.ctrlKey || event.metaKey) && event.key === '/') {
          event.preventDefault();
          setOpened((prev) => !prev);
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor]);

  // Also listen on window for when the editor doesn't have focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setOpened((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <Tooltip label={t('textEditorShortcuts')} position="bottom" withArrow>
        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={open}
          aria-label={t('shortcutsTitle')}
        >
          <IconKeyboard size={16} />
        </ActionIcon>
      </Tooltip>
      <KeyboardShortcutsModal opened={opened} onClose={close} />
    </>
  );
}
