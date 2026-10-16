import { AppShell, Group, Tabs, Title, Text, Box, SegmentedControl, Tooltip, useMantineColorScheme, type MantineColorScheme, Loader, Center, Button, Menu } from '@mantine/core';
import { IconLanguage, IconBook, IconLibrary, IconEdit, IconSun, IconMoon, IconDeviceDesktop, IconAbc, IconLogin, IconUser, IconTextSpellcheck } from '@tabler/icons-react';
import { lazy, Suspense, useCallback } from 'react';
import { useRouter } from './router';
import { useI18n } from './i18n';
import { useAuth } from './auth';
import ThemeMenu from './components/ThemeMenu';
import { type ThemeName } from './theme';
import logo from './assets/logo.png';
import classes from './App.module.css';

// Lazy-loaded page components for bundle splitting
const Converter = lazy(() => import('./pages/Converter'));
const DictionaryManager = lazy(() => import('./pages/DictionaryManager'));
const NaturalDictionary = lazy(() => import('./pages/NaturalDictionary'));
const SpellingWords = lazy(() => import('./pages/SpellingWords'));
const Corrections = lazy(() => import('./pages/Corrections'));
const TextEditor = lazy(() => import('./pages/TextEditor'));

interface AppProps {
  colorScheme: MantineColorScheme;
  onColorSchemeChange: (scheme: MantineColorScheme) => void;
  theme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
}

export default function App({ colorScheme, onColorSchemeChange, theme, onThemeChange }: AppProps) {
  const { route, setPage, browseDictionary, backToList } = useRouter();
  const { locale, setLocale, t } = useI18n();
  const { setColorScheme } = useMantineColorScheme();
  const { user, loading: authLoading, login, logout } = useAuth();

  // The editor keeps unsaved work as a browser draft, so leaving its tab needs no guard.
  const handleTabChange = useCallback((v: string | null) => setPage(v || 'converter'), [setPage]);

  const handleColorSchemeChange = (scheme: string) => {
    const s = scheme as MantineColorScheme;
    onColorSchemeChange(s);
    setColorScheme(s);
  };

  const activeTab = route.page === 'natural-dictionary' ? 'natural-dictionary'
    : route.page === 'dictionary' ? 'dictionary'
    : route.page === 'spelling' ? 'spelling'
    : route.page === 'corrections' ? 'corrections'
    : route.page === 'editor' ? 'editor'
    : 'converter';

  return (
    <AppShell
      header={{ height: 60 }}
      padding="md"
      styles={{
        main: { display: 'flex', flexDirection: 'column', minHeight: '100vh' },
        header: {
          fontFamily: 'var(--mantine-font-family)',
          backgroundColor: 'var(--nw-chrome-bg)',
          borderBottom: '3px solid var(--nw-chrome-rule)',
        },
      }}
    >
      <AppShell.Header px="md" className={classes.header}>
        <Group h="100%" justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <img src={logo} alt="" className={classes.logo} />
            <Title order={3} size="h4" ff="heading" className={classes.title}>{t('appTitle')}</Title>
            <Text size="xs" visibleFrom="xl" ff="text" className={classes.subtitle}>{t('appSubtitle')}</Text>
          </Group>

          <Group gap="md" wrap="nowrap" style={{ minWidth: 0 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="default"
              styles={{ root: { alignSelf: 'stretch', display: 'flex', minWidth: 0, overflowX: 'auto' }, list: { borderBottom: 'none', flexWrap: 'nowrap' } }}
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
                <Tabs.Tab value="spelling" leftSection={<IconAbc size={16} />}>
                  {t('tabSpelling')}
                </Tabs.Tab>
                <Tabs.Tab value="corrections" leftSection={<IconTextSpellcheck size={16} />}>
                  {t('tabCorrections')}
                </Tabs.Tab>
                <Tabs.Tab value="editor" leftSection={<IconEdit size={16} />}>
                  {t('tabEditor')}
                </Tabs.Tab>
              </Tabs.List>
            </Tabs>

            {/* Theme: Nawishta, plain white or plain black */}
            <ThemeMenu theme={theme} onThemeChange={onThemeChange} />

            {/* Color scheme toggle (Nawishta theme only: the plain themes fix the scheme) */}
            <SegmentedControl
              size="xs"
              disabled={theme !== 'nawishta'}
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

            {/* Account: login happens on the main site, which shares the API's cookies */}
            {!authLoading && (user ? (
              <Menu shadow="md" position="bottom-end">
                <Menu.Target>
                  <Button size="compact-sm" variant="subtle" leftSection={<IconUser size={14} />}>{user.name}</Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item onClick={() => logout()}>{t('authLogout')}</Menu.Item>
                </Menu.Dropdown>
              </Menu>
            ) : (
              <Button size="compact-sm" variant="light" leftSection={<IconLogin size={14} />} onClick={login}>{t('authLogin')}</Button>
            ))}
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Box style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Suspense fallback={<Center py="xl"><Loader size="md" /></Center>}>
            {activeTab === 'converter' && <Converter />}
            {activeTab === 'dictionary' && <DictionaryManager />}
            {activeTab === 'spelling' && <SpellingWords />}
            {activeTab === 'corrections' && <Corrections urlParams={route.params} />}
            {activeTab === 'natural-dictionary' && (
              <NaturalDictionary
                activeDictionaryId={route.dictionaryId}
                urlParams={route.params}
                onBrowse={browseDictionary}
                onBackToList={backToList}
              />
            )}
            {activeTab === 'editor' && <TextEditor />}
          </Suspense>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
