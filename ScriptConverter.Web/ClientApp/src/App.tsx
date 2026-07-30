import { Container, Tabs, Title, Text, Stack } from '@mantine/core';
import { IconLanguage, IconBook, IconLibrary } from '@tabler/icons-react';
import { useRouter } from './router';
import Converter from './pages/Converter';
import DictionaryManager from './pages/DictionaryManager';
import NaturalDictionary from './pages/NaturalDictionary';

export default function App() {
  const { route, setPage, browseDictionary, backToList } = useRouter();

  const activeTab = route.page === 'natural-dictionary' ? 'natural-dictionary'
    : route.page === 'dictionary' ? 'dictionary'
    : 'converter';

  return (
    <Container size="lg" py="xl">
      <Stack align="center" mb="lg" gap={4}>
        <Title order={1} size="h2">Script Converter</Title>
        <Text c="dimmed" size="sm">Transliterate between Urdu, Hindi, and Roman scripts</Text>
      </Stack>

      <Tabs value={activeTab} onChange={(v) => setPage(v || 'converter')}>
        <Tabs.List justify="center" mb="lg">
          <Tabs.Tab value="converter" leftSection={<IconLanguage size={16} />}>
            Converter
          </Tabs.Tab>
          <Tabs.Tab value="dictionary" leftSection={<IconBook size={16} />}>
            Dictionary
          </Tabs.Tab>
          <Tabs.Tab value="natural-dictionary" leftSection={<IconLibrary size={16} />}>
            Natural Dictionary
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="converter">
          <Converter />
        </Tabs.Panel>

        <Tabs.Panel value="dictionary">
          <DictionaryManager />
        </Tabs.Panel>

        <Tabs.Panel value="natural-dictionary">
          <NaturalDictionary
            activeDictionaryId={route.dictionaryId}
            urlParams={route.params}
            onBrowse={browseDictionary}
            onBackToList={backToList}
          />
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
