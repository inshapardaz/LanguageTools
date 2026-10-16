import { ActionIcon, Menu } from '@mantine/core';
import { IconApps } from '@tabler/icons-react';
import { useI18n } from '../i18n';
import { MAIN_SITE, LIBRARIES_URL, LIBRARY_EDITOR_URL, DICTIONARY_URL } from '../config';

// The Nawishta apps, in menu order. This app is the dictionary/language tools; the URLs are
// configurable (see config.ts).
const APPS = [
  { key: 'home', label: 'appsHome', href: MAIN_SITE },
  { key: 'libraries', label: 'appsLibraries', href: LIBRARIES_URL },
  { key: 'editor', label: 'appsEditor', href: LIBRARY_EDITOR_URL },
  { key: 'dictionary', label: 'appsDictionary', href: DICTIONARY_URL, current: true },
] as const;

// Header menu for jumping between the Nawishta apps.
export default function AppSwitcher() {
  const { t } = useI18n();

  return (
    <Menu position="bottom-end" shadow="md" withinPortal>
      <Menu.Target>
        <ActionIcon variant="subtle" size="lg" aria-label={t('appsTitle')}>
          <IconApps size={20} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{t('appsTitle')}</Menu.Label>
        {APPS.map((app) => (
          <Menu.Item
            key={app.key}
            component="a"
            href={app.href}
            aria-current={'current' in app ? 'true' : undefined}
            fw={'current' in app ? 700 : 400}
          >
            {t(app.label)}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
