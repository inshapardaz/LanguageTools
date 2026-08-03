import { useMemo } from 'react';
import { Box, Group, Kbd, Modal, Stack, Text } from '@mantine/core';

export interface KeyboardShortcutsModalProps {
  opened: boolean;
  onClose: () => void;
}

interface ShortcutEntry {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  label: string;
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
      label: 'Formatting',
      shortcuts: [
        { keys: [mod, 'B'], description: 'Bold' },
        { keys: [mod, 'I'], description: 'Italic' },
        { keys: [mod, 'U'], description: 'Underline' },
      ],
    },
    {
      label: 'History',
      shortcuts: [
        { keys: [mod, 'Z'], description: 'Undo' },
        { keys: [mod, 'Y'], description: 'Redo' },
        { keys: [mod, 'Shift', 'Z'], description: 'Redo (alternate)' },
      ],
    },
    {
      label: 'Zoom',
      shortcuts: [
        { keys: [mod, '='], description: 'Zoom in' },
        { keys: [mod, '-'], description: 'Zoom out' },
        { keys: [mod, '0'], description: 'Reset zoom' },
      ],
    },
    {
      label: 'Document',
      shortcuts: [
        { keys: [mod, 'S'], description: 'Save' },
      ],
    },
    {
      label: 'Tools',
      shortcuts: [
        { keys: [mod, 'D'], description: 'Dictionary lookup' },
        { keys: [mod, '/'], description: 'Show keyboard shortcuts' },
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

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Keyboard Shortcuts"
      size="md"
      aria-label="Keyboard shortcuts"
      centered
    >
      <Stack gap="md">
        {groups.map((group) => (
          <Box key={group.label}>
            <Text fw={600} size="sm" mb="xs" c="dimmed">
              {group.label}
            </Text>
            <Stack gap={4}>
              {group.shortcuts.map((shortcut) => (
                <Group
                  key={shortcut.description}
                  justify="space-between"
                  wrap="nowrap"
                  py={4}
                  px="xs"
                  style={{ borderRadius: 'var(--mantine-radius-sm)' }}
                >
                  <Text size="sm">{shortcut.description}</Text>
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
