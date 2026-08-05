import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { COMMAND_PRIORITY_HIGH, KEY_DOWN_COMMAND } from 'lexical';

interface SavePluginProps {
  onSave?: () => void;
}

/**
 * Lexical plugin that listens for Ctrl+S / Cmd+S and triggers a save callback.
 * The actual serialization and storage is handled by the parent component.
 */
export default function SavePlugin({ onSave }: SavePluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
          event.preventDefault();
          onSave?.();
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor, onSave]);

  return null;
}
