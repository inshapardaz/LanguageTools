import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Group,
  Modal,
  SegmentedControl,
  Text,
  TextInput,
} from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { IconPhoto, IconUpload, IconX } from '@tabler/icons-react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $insertNodes,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  type LexicalCommand,
} from 'lexical';
import { $createImageNode, type ImagePayload } from '../nodes/ImageNode';

// ─── Command ───────────────────────────────────────────────────────────────────

export type InsertImagePayload =
  | { src: string; alt?: string; width?: number; height?: number }
  | { file: File; alt?: string }
  | { showDialog: true };

export const INSERT_IMAGE_COMMAND: LexicalCommand<InsertImagePayload> =
  createCommand('INSERT_IMAGE_COMMAND');

// ─── Helper: file to base64 data URI ───────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Plugin Component ──────────────────────────────────────────────────────────

/**
 * ImagePlugin handles the INSERT_IMAGE_COMMAND and provides a modal
 * for inserting images via URL or file upload.
 */
export default function ImagePlugin() {
  const [editor] = useLexicalComposerContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<'url' | 'upload'>('url');
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setUrl('');
    setAlt('');
    setFile(null);
    setMode('url');
  }, []);

  // Register the command handler
  useEffect(() => {
    return editor.registerCommand<InsertImagePayload>(
      INSERT_IMAGE_COMMAND,
      (payload) => {
        // If the command is a "show dialog" signal, open the modal
        if ('showDialog' in payload) {
          setIsModalOpen(true);
          return true;
        }

        if ('file' in payload) {
          // File payload — convert to base64 and insert
          fileToBase64(payload.file).then((dataUri) => {
            editor.update(() => {
              const imageNode = $createImageNode({
                src: dataUri,
                alt: payload.alt || '',
              });
              $insertNodes([imageNode]);
            });
          });
        } else {
          // URL payload — insert directly
          editor.update(() => {
            const imageNode = $createImageNode({
              src: payload.src,
              alt: payload.alt || '',
              width: payload.width,
              height: payload.height,
            });
            $insertNodes([imageNode]);
          });
        }
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  const handleInsert = useCallback(() => {
    if (mode === 'url' && url.trim()) {
      editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
        src: url.trim(),
        alt: alt.trim() || undefined,
      });
      closeModal();
    } else if (mode === 'upload' && file) {
      editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
        file,
        alt: alt.trim() || undefined,
      });
      closeModal();
    }
  }, [mode, url, alt, file, editor, closeModal]);

  return (
    <Modal
      opened={isModalOpen}
      onClose={closeModal}
      title="Insert Image"
      size="md"
      centered
    >
      <SegmentedControl
        value={mode}
        onChange={(val) => setMode(val as 'url' | 'upload')}
        data={[
          { label: 'URL', value: 'url' },
          { label: 'Upload', value: 'upload' },
        ]}
        fullWidth
        mb="md"
      />

      {mode === 'url' ? (
        <TextInput
          label="Image URL"
          placeholder="https://example.com/image.png"
          value={url}
          onChange={(e) => setUrl(e.currentTarget.value)}
          mb="sm"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleInsert();
            }
          }}
        />
      ) : (
        <>
          <Dropzone
            onDrop={(files) => {
              if (files.length > 0) {
                setFile(files[0]);
              }
            }}
            accept={IMAGE_MIME_TYPE}
            maxSize={10 * 1024 * 1024}
            multiple={false}
            mb="sm"
          >
            <Group justify="center" gap="xl" mih={120} style={{ pointerEvents: 'none' }}>
              <Dropzone.Accept>
                <IconUpload size={40} stroke={1.5} />
              </Dropzone.Accept>
              <Dropzone.Reject>
                <IconX size={40} stroke={1.5} />
              </Dropzone.Reject>
              <Dropzone.Idle>
                <IconPhoto size={40} stroke={1.5} />
              </Dropzone.Idle>
              <div>
                <Text size="sm" inline>
                  {file ? file.name : 'Drag an image here or click to select'}
                </Text>
                <Text size="xs" c="dimmed" inline mt={4}>
                  Max file size: 10MB
                </Text>
              </div>
            </Group>
          </Dropzone>
          {file && (
            <Text size="xs" c="dimmed" mb="sm">
              Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </Text>
          )}
        </>
      )}

      <TextInput
        label="Alt text"
        placeholder="Describe the image"
        value={alt}
        onChange={(e) => setAlt(e.currentTarget.value)}
        mb="md"
      />

      <Group justify="flex-end">
        <Button variant="subtle" onClick={closeModal}>
          Cancel
        </Button>
        <Button
          onClick={handleInsert}
          disabled={mode === 'url' ? !url.trim() : !file}
        >
          Insert
        </Button>
      </Group>
    </Modal>
  );
}
