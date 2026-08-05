import { AppShell, Group, Tabs, Title, Text, Box, SegmentedControl, ActionIcon, Tooltip, useMantineColorScheme, type MantineColorScheme, Loader, Center } from '@mantine/core';
import { IconLanguage, IconBook, IconLibrary, IconEdit, IconSun, IconMoon, IconDeviceDesktop } from '@tabler/icons-react';
import { lazy, Suspense, useCallback, useRef, useState } from 'react';
import { useRouter } from './router';
import { useI18n } from './i18n';

// Lazy-loaded page components for bundle splitting
const Converter = lazy(() => import('./pages/Converter'));
const DictionaryManager = lazy(() => import('./pages/DictionaryManager'));
const NaturalDictionary = lazy(() => import('./pages/NaturalDictionary'));
const TextEditor = lazy(() => import('./pages/TextEditor'));

interface AppProps {
  colorScheme: MantineColorScheme;
  onColorSchemeChange: (scheme: MantineColorScheme) => void;
}

export default function App({ colorScheme, onColorSchemeChange }: AppProps) {
  const { route, setPage, browseDictionary, backToList } = useRouter();
  const { locale, setLocale, t } = useI18n();
  const { setColorScheme } = useMantineColorScheme();

  // Navigation guard: TextEditor can register a guard that returns true if navigation should be blocked
  const navigationGuardRef = useRef<((target: string) => boolean) | null>(null);

  const handleTabChange = useCallback((v: string | null) => {
    const target = v || 'converter';
    // If navigating away from the editor tab, check the guard
    if (route.page === 'editor' && target !== 'editor') {
      if (navigationGuardRef.current?.(target)) {
        // Guard returned true — navigation blocked, TextEditor will show its own modal
        return;
      }
    }
    setPage(target);
  }, [route.page, setPage]);

  const handleColorSchemeChange = (scheme: string) => {
    const s = scheme as MantineColorScheme;
    onColorSchemeChange(s);
    setColorScheme(s);
  };

  const activeTab = route.page === 'natural-dictionary' ? 'natural-dictionary'
    : route.page === 'dictionary' ? 'dictionary'
    : route.page === 'editor' ? 'editor'
    : 'converter';

  return (
    <AppShell
      header={{ height: 60 }}
      padding="md"
      styles={{
        main: { display: 'flex', flexDirection: 'column', minHeight: '100vh' },
        header: { fontFamily: 'var(--mantine-font-family)' },
      }}
    >
      <AppShell.Header px="md">
        <Group h="100%" justify="space-between">
          <Group gap="xs">
            <Title order={3} size="h4" ff="heading">{t('appTitle')}</Title>
            <Text c="dimmed" size="xs" visibleFrom="sm" ff="text">{t('appSubtitle')}</Text>
          </Group>

          <Group gap="md">
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="default"
              styles={{ root: { alignSelf: 'stretch', display: 'flex' }, list: { borderBottom: 'none' } }}
            >
              <Tabs.List h="100%">
                <Tabs.Tab value="converter" leftSection={<IconLanguage size={16} />}>
                  {t('tabConverter')}
                </Tabs.Tab>
                <Tabs.Tab value="dictionary" leftSection={<IconBook size={16} />}>
                  {t('tabDictionary')}
                </Tabs.Tab>
                <Tabs.Tab value="natural-dictionary" leftSection={<IconLibrary size={16} />}>
                  {t('tabNaturalDictionary')}
                </Tabs.Tab>
                <Tabs.Tab value="editor" leftSection={<IconEdit size={16} />}>
                  {t('tabEditor')}
                </Tabs.Tab>
              </Tabs.List>
            </Tabs>

            {/* Color scheme toggle */}
            <SegmentedControl
              size="xs"
              value={colorScheme}
              onChange={handleColorSchemeChange}
              data={[
                { value: 'light', label: <Tooltip label="Light"><IconSun size={14} /></Tooltip> },
                { value: 'dark', label: <Tooltip label="Dark"><IconMoon size={14} /></Tooltip> },
                { value: 'auto', label: <Tooltip label="System"><IconDeviceDesktop size={14} /></Tooltip> },
              ]}
            />

            {/* Language toggle */}
            <SegmentedControl
              size="xs"
              value={locale}
              onChange={(v) => setLocale(v as 'en' | 'ur')}
              data={[
                { value: 'en', label: 'EN' },
                { value: 'ur', label: 'اردو' },
              ]}
            />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Box style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Suspense fallback={<Center py="xl"><Loader size="md" /></Center>}>
            {activeTab === 'converter' && <Converter />}
            {activeTab === 'dictionary' && <DictionaryManager />}
            {activeTab === 'natural-dictionary' && (
              <NaturalDictionary
                activeDictionaryId={route.dictionaryId}
                urlParams={route.params}
                onBrowse={browseDictionary}
                onBackToList={backToList}
              />
            )}
            {activeTab === 'editor' && (
              <TextEditor
                navigationGuardRef={navigationGuardRef}
                onNavigateAway={setPage}
              />
            )}
          </Suspense>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
