import { useEffect, useState } from 'react';
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IconDeviceFloppy,
  IconFile,
  IconFilePlus,
  IconFolder,
  IconTrash,
} from '@tabler/icons-react';
import { useI18n } from '../../i18n';
import { type DocumentMeta, deleteDocument, listDocuments } from './utils/documentStorage';

interface DocumentManagerProps {
  /** Currently open document ID (if any). */
  currentDocId: string | null;
  /** Called when user wants to open a saved document. */
  onOpen: (id: string) => void;
  /** Called when user wants to create a new document. */
  onNew: () => void;
  /** Called when user triggers save. */
  onSave: () => void;
}

export default function DocumentManager({
  currentDocId,
  onOpen,
  onNew,
  onSave,
}: DocumentManagerProps) {
  const { t } = useI18n();
  const [opened, setOpened] = useState(false);
  const [docs, setDocs] = useState<DocumentMeta[]>([]);

  useEffect(() => {
    if (opened) {
      setDocs(listDocuments());
    }
  }, [opened]);

  const handleDelete = (id: string) => {
    deleteDocument(id);
    setDocs(listDocuments());
  };

  const handleOpen = (id: string) => {
    onOpen(id);
    setOpened(false);
  };

  return (
    <>
      {/* Toolbar buttons */}
      <Group gap={4} role="group" aria-label="Document management">
        <Tooltip label={t('textEditorNewDoc')}>
          <ActionIcon variant="subtle" size="sm" onClick={onNew} aria-label={t('textEditorNewDoc')}>
            <IconFilePlus size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t('textEditorOpenDoc')}>
          <ActionIcon variant="subtle" size="sm" onClick={() => setOpened(true)} aria-label={t('textEditorOpenDoc')} aria-haspopup="dialog">
            <IconFolder size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t('textEditorSaveDoc')}>
          <ActionIcon variant="subtle" size="sm" onClick={onSave} aria-label={t('textEditorSaveDoc')}>
            <IconDeviceFloppy size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* Document list modal */}
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={t('textEditorSavedDocs')}
        size="md"
      >
        <Stack gap="sm">
          {docs.length === 0 ? (
            <Text c="dimmed" ta="center" py="md">
              {t('textEditorNoDocs')}
            </Text>
          ) : (
            docs.map((doc) => (
              <Box
                key={doc.id}
                p="sm"
                style={{
                  border: '1px solid var(--mantine-color-default-border)',
                  borderRadius: 'var(--mantine-radius-sm)',
                  background:
                    doc.id === currentDocId
                      ? 'var(--mantine-color-blue-light)'
                      : undefined,
                }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Box
                    style={{ cursor: 'pointer', flex: 1, overflow: 'hidden' }}
                    onClick={() => handleOpen(doc.id)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open document: ${doc.title}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpen(doc.id);
                      }
                    }}
                  >
                    <Text fw={500} truncate>
                      <IconFile size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                      {doc.title}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {new Date(doc.updatedAt).toLocaleString()}
                    </Text>
                  </Box>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="sm"
                    onClick={() => handleDelete(doc.id)}
                    aria-label={`Delete document: ${doc.title}`}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Box>
            ))
          )}
          <Button
            variant="light"
            leftSection={<IconFilePlus size={16} />}
            onClick={() => {
              onNew();
              setOpened(false);
            }}
          >
            {t('textEditorNewDoc')}
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
