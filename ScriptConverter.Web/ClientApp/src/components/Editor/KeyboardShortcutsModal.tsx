import { useMemo } from 'react';
import { Box, Group, Kbd, Modal, Stack, Text } from '@mantine/core';
import { useI18n } from '../../i18n';
import type { TranslationKeys } from '../../i18n';

export interface KeyboardShortcutsModalProps {
  opened: boolean;
  onClose: () => void;
}

interface ShortcutEntry {
  keys: string[];
  descriptionKey: TranslationKeys;
}

interface ShortcutGroup {
  labelKey: TranslationKeys;
  shortcuts: ShortcutEntry[];
}

/**
 * Detects whether the user is on macOS to show Cmd instead of Ctrl.
 */
function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform ?? navigator.userAgent);
}

/**
 * Returns the platform-appropriate modifier key label.
 */
function modKey(): string {
  return isMac() ? '⌘' : 'Ctrl';
}

function getShortcutGroups(): ShortcutGroup[] {
  const mod = modKey();

  return [
    {
      labelKey: 'shortcutsFormatting',
      shortcuts: [
        { keys: [mod, 'B'], descriptionKey: 'shortcutBold' },
        { keys: [mod, 'I'], descriptionKey: 'shortcutItalic' },
        { keys: [mod, 'U'], descriptionKey: 'shortcutUnderline' },
      ],
    },
    {
      labelKey: 'shortcutsHistory',
      shortcuts: [
        { keys: [mod, 'Z'], descriptionKey: 'shortcutUndo' },
        { keys: [mod, 'Y'], descriptionKey: 'shortcutRedo' },
        { keys: [mod, 'Shift', 'Z'], descriptionKey: 'shortcutRedoAlt' },
      ],
    },
    {
      labelKey: 'shortcutsZoom',
      shortcuts: [
        { keys: [mod, '='], descriptionKey: 'shortcutZoomIn' },
        { keys: [mod, '-'], descriptionKey: 'shortcutZoomOut' },
        { keys: [mod, '0'], descriptionKey: 'shortcutResetZoom' },
      ],
    },
    {
      labelKey: 'shortcutsDocument',
      shortcuts: [
        { keys: [mod, 'S'], descriptionKey: 'shortcutSave' },
      ],
    },
    {
      labelKey: 'shortcutsTools',
      shortcuts: [
        { keys: [mod, 'D'], descriptionKey: 'shortcutDictLookup' },
        { keys: [mod, '/'], descriptionKey: 'shortcutShowShortcuts' },
      ],
    },
  ];
}

/**
 * Modal that displays all available keyboard shortcuts grouped by category.
 * Uses platform-appropriate modifier key labels (Cmd on Mac, Ctrl otherwise).
 */
export default function KeyboardShortcutsModal({
  opened,
  onClose,
}: KeyboardShortcutsModalProps) {
  const groups = useMemo(() => getShortcutGroups(), []);
  const { t } = useI18n();

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('shortcutsTitle')}
      size="md"
      aria-label={t('shortcutsTitle')}
      centered
    >
      <Stack gap="md">
        {groups.map((group) => (
          <Box key={group.labelKey}>
            <Text fw={600} size="sm" mb="xs" c="dimmed">
              {t(group.labelKey)}
            </Text>
            <Stack gap={4}>
              {group.shortcuts.map((shortcut) => (
                <Group
                  key={shortcut.descriptionKey}
                  justify="space-between"
                  wrap="nowrap"
                  py={4}
                  px="xs"
                  style={{ borderRadius: 'var(--mantine-radius-sm)' }}
                >
                  <Text size="sm">{t(shortcut.descriptionKey)}</Text>
                  <Group gap={4} wrap="nowrap">
                    {shortcut.keys.map((key, i) => (
                      <span key={i}>
                        <Kbd size="sm">{key}</Kbd>
                        {i < shortcut.keys.length - 1 && (
                          <Text component="span" size="xs" c="dimmed" mx={2}>
                            +
                          </Text>
                        )}
                      </span>
                    ))}
                  </Group>
                </Group>
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Modal>
  );
}
