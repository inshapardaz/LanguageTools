import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { EditorRefHandle } from '../types';

interface EditorRefPluginProps {
  editorRef: React.MutableRefObject<EditorRefHandle | null>;
}

/**
 * Lexical plugin that exposes a ref handle for imperative access to editor state.
 * Used by parent components to serialize the current editor state for saving.
 */
export default function EditorRefPlugin({ editorRef }: EditorRefPluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editorRef.current = {
      getEditorState: () => JSON.stringify(editor.getEditorState().toJSON()),
    };
    return () => {
      editorRef.current = null;
    };
  }, [editor, editorRef]);

  return null;
}
