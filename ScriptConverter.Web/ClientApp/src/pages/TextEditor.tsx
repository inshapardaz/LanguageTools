import { useCallback, useRef, useState } from 'react';
import { Box, Divider, Notification, Paper } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { useI18n } from '../i18n';
import { Editor, createApiDictionaryProvider } from '../components/Editor';
import DocumentManager from '../components/Editor/DocumentManager';
import {
  type SavedDocument,
  generateDocId,
  loadDocument,
  saveDocument,
} from '../components/Editor/utils/documentStorage';

const dictionaryProvider = createApiDictionaryProvider();

export default function TextEditor() {
  const { dir, t } = useI18n();
  const [currentDoc, setCurrentDoc] = useState<SavedDocument | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  // Key to force re-mount of Editor when loading a different document
  const [editorKey, setEditorKey] = useState(0);
  const editorRef = useRef<{ getEditorState: () => string } | null>(null);

  const handleSave = useCallback(() => {
    const content = editorRef.current?.getEditorState();
    if (!content) return;

    const now = new Date().toISOString();
    const doc: SavedDocument = currentDoc
      ? { ...currentDoc, content, updatedAt: now }
      : {
          id: generateDocId(),
          title: t('textEditorUntitled'),
          font: '',
          direction: dir,
          zoom: 1.0,
          content,
          updatedAt: now,
        };

    saveDocument(doc);
    setCurrentDoc(doc);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  }, [currentDoc, dir, t]);

  const handleOpen = useCallback((id: string) => {
    const doc = loadDocument(id);
    if (doc) {
      setCurrentDoc(doc);
      setEditorKey((k) => k + 1);
    }
  }, []);

  const handleNew = useCallback(() => {
    setCurrentDoc(null);
    setEditorKey((k) => k + 1);
  }, []);

  return (
    <Paper shadow="xs" p="lg" radius="md" withBorder component="main" aria-label="Text Editor">
      {/* Document management toolbar */}
      <Box mb="sm" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <DocumentManager
          currentDocId={currentDoc?.id ?? null}
          onOpen={handleOpen}
          onNew={handleNew}
          onSave={handleSave}
        />
        <Divider orientation="vertical" />
        {currentDoc && (
          <Box style={{ fontSize: '0.85rem', color: 'var(--mantine-color-dimmed)' }}>
            {currentDoc.title}
          </Box>
        )}
      </Box>

      <Editor
        key={editorKey}
        showToolbar={true}
        showStatusBar={true}
        direction={currentDoc?.direction ?? dir}
        documentFont={currentDoc?.font}
        zoom={currentDoc?.zoom}
        initialEditorState={currentDoc?.content}
        editorRef={editorRef}
        onSave={handleSave}
        dictionaryProvider={dictionaryProvider}
      />

      {/* Save confirmation notification */}
      {showSaved && (
        <Notification
          icon={<IconCheck size={16} />}
          color="green"
          withCloseButton={false}
          style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}
        >
          {t('textEditorSaved')}
        </Notification>
      )}
    </Paper>
  );
}
