import { Button, Group, Modal, Text } from '@mantine/core';
import { IconDeviceFloppy, IconX, IconArrowRight } from '@tabler/icons-react';
import { useI18n } from '../../i18n';

export interface UnsavedChangesModalProps {
  /** Whether the modal is open. */
  opened: boolean;
  /** Called when user chooses to save first. */
  onSave: () => void;
  /** Called when user chooses to discard changes and continue. */
  onDiscard: () => void;
  /** Called when user cancels (stays on current document). */
  onCancel: () => void;
}

/**
 * Centered confirmation modal shown when the user has unsaved editor changes
 * and attempts to navigate away, create a new document, or open another document.
 */
export default function UnsavedChangesModal({
  opened,
  onSave,
  onDiscard,
  onCancel,
}: UnsavedChangesModalProps) {
  const { t } = useI18n();

  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title={t('unsavedChangesTitle')}
      centered
      size="sm"
      overlayProps={{ backgroundOpacity: 0.4, blur: 2 }}
    >
      <Text mb="lg">{t('unsavedChangesMessage')}</Text>
      <Group justify="flex-end" gap="sm">
        <Button
          variant="default"
          leftSection={<IconX size={16} />}
          onClick={onCancel}
        >
          {t('unsavedChangesCancel')}
        </Button>
        <Button
          variant="light"
          color="orange"
          leftSection={<IconArrowRight size={16} />}
          onClick={onDiscard}
        >
          {t('unsavedChangesDiscard')}
        </Button>
        <Button
          leftSection={<IconDeviceFloppy size={16} />}
          onClick={onSave}
        >
          {t('unsavedChangesSave')}
        </Button>
      </Group>
    </Modal>
  );
}
