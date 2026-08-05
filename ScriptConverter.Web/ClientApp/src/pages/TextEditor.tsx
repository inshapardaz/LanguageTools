import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Divider, Notification, Paper } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { useI18n } from '../i18n';
import { Editor, createApiDictionaryProvider } from '../components/Editor';
import DocumentManager from '../components/Editor/DocumentManager';
import UnsavedChangesModal from '../components/Editor/UnsavedChangesModal';
import {
  type SavedDocument,
  generateDocId,
  loadDocument,
  saveDocument,
} from '../components/Editor/utils/documentStorage';

const dictionaryProvider = createApiDictionaryProvider();

export interface TextEditorProps {
  /** Ref for registering a navigation guard — receives target page, returns true if navigation should be blocked. */
  navigationGuardRef?: React.MutableRefObject<((target: string) => boolean) | null>;
  /** Called to perform deferred navigation after the unsaved-changes modal resolves. */
  onNavigateAway?: (target: string) => void;
}

export default function TextEditor({ navigationGuardRef, onNavigateAway }: TextEditorProps) {
  const { dir, t } = useI18n();
  const [currentDoc, setCurrentDoc] = useState<SavedDocument | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  // Key to force re-mount of Editor when loading a different document
  const [editorKey, setEditorKey] = useState(0);
  const editorRef = useRef<{ getEditorState: () => string } | null>(null);

  // Pending action when unsaved changes modal is shown
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const showUnsavedModal = pendingAction !== null;

  // Track content changes
  const handleContentChange = useCallback(() => {
    setIsDirty(true);
  }, []);

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
    setIsDirty(false);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  }, [currentDoc, dir, t]);

  const handleOpen = useCallback((id: string) => {
    const doOpen = () => {
      const doc = loadDocument(id);
      if (doc) {
        setCurrentDoc(doc);
        setIsDirty(false);
        setEditorKey((k) => k + 1);
      }
    };

    if (isDirty) {
      setPendingAction(() => doOpen);
    } else {
      doOpen();
    }
  }, [isDirty]);

  const handleNew = useCallback(() => {
    const doNew = () => {
      setCurrentDoc(null);
      setIsDirty(false);
      setEditorKey((k) => k + 1);
    };

    if (isDirty) {
      setPendingAction(() => doNew);
    } else {
      doNew();
    }
  }, [isDirty]);

  // Modal handlers
  const handleModalSave = useCallback(() => {
    handleSave();
    const action = pendingAction;
    setPendingAction(null);
    action?.();
  }, [handleSave, pendingAction]);

  const handleModalDiscard = useCallback(() => {
    const action = pendingAction;
    setPendingAction(null);
    setIsDirty(false);
    action?.();
  }, [pendingAction]);

  const handleModalCancel = useCallback(() => {
    setPendingAction(null);
  }, []);

  // Browser beforeunload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Pending navigation target (for tab switching away from editor)
  const pendingNavTargetRef = useRef<string | null>(null);

  // Register navigation guard with parent App
  useEffect(() => {
    if (!navigationGuardRef) return;
    navigationGuardRef.current = (target: string) => {
      if (!isDirty) return false;
      // Store navigation target and show the modal
      pendingNavTargetRef.current = target;
      setPendingAction(() => () => {
        const navTarget = pendingNavTargetRef.current;
        pendingNavTargetRef.current = null;
        if (navTarget && onNavigateAway) {
          onNavigateAway(navTarget);
        }
      });
      return true;
    };
    return () => {
      navigationGuardRef.current = null;
    };
  }, [navigationGuardRef, isDirty, onNavigateAway]);

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
        onChange={handleContentChange}
        dictionaryProvider={dictionaryProvider}
      />

      {/* Unsaved changes confirmation modal */}
      <UnsavedChangesModal
        opened={showUnsavedModal}
        onSave={handleModalSave}
        onDiscard={handleModalDiscard}
        onCancel={handleModalCancel}
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
