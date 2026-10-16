import { ActionIcon, ColorSwatch, Group, Menu, Text } from '@mantine/core';
import { IconCheck, IconPalette } from '@tabler/icons-react';
import { useI18n } from '../i18n';
import { THEMES, type ThemeName } from '../theme';

// Swatches shown beside each theme's name: [surface, accent]
const SWATCHES: Record<ThemeName, [string, string]> = {
  nawishta: ['#f3ead8', '#163831'],
  white: ['#ffffff', '#1c7ed6'],
  black: ['#000000', '#74c0fc'],
};

const LABELS = {
  nawishta: 'themeNawishta',
  white: 'themeWhite',
  black: 'themeBlack',
} as const;

interface ThemeMenuProps {
  theme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
}

// The site theme: Nawishta, plain white or plain black (remembered in local storage).
export default function ThemeMenu({ theme, onThemeChange }: ThemeMenuProps) {
  const { t } = useI18n();

  return (
    <Menu position="bottom-end" shadow="md" withinPortal>
      <Menu.Target>
        <ActionIcon variant="subtle" size="lg" aria-label={t('appearanceTitle')}>
          <IconPalette size={20} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{t('appearanceTheme')}</Menu.Label>
        {THEMES.map((name) => (
          <Menu.Item
            key={name}
            onClick={() => onThemeChange(name)}
            rightSection={theme === name ? <IconCheck size={14} /> : null}
          >
            <Group gap="xs" wrap="nowrap">
              {SWATCHES[name].map((color) => <ColorSwatch key={color} color={color} size={14} withShadow />)}
              <Text size="sm" fw={theme === name ? 600 : 400}>{t(LABELS[name])}</Text>
            </Group>
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
