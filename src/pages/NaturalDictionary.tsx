import { useState, useEffect, useCallback } from 'react';
import { Paper, Table, Group, Button, Modal, Stack, Badge, Text, Autocomplete } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { IconSearch, IconUpload, IconTrash, IconBook } from '@tabler/icons-react';
import { updateParams } from '../router';
import { useI18n } from '../i18n';
import DictionaryBrowser from './DictionaryBrowser';
import ArticleView from '../components/ArticleView';
import {
  deleteDictionary, getDictionaries, lookupWord as lookupInDictionaries, suggestHeadwords, uploadDictionary,
  type Article, type DictionaryInfo,
} from '../api/languageTools';

interface Props {
  activeDictionaryId: string | null;
  urlParams: Record<string, string>;
  onBrowse: (id: string) => void;
  onBackToList: () => void;
}

export default function NaturalDictionary({ activeDictionaryId, urlParams, onBrowse, onBackToList }: Props) {
  const { t } = useI18n();
  const [dictionaries, setDictionaries] = useState<DictionaryInfo[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [lookupWord, setLookupWord] = useState('');
  const [lookupResults, setLookupResults] = useState<{ headword: string; entries: Article[] } | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const fetchDictionaries = useCallback(async () => {
    try {
      const page = await getDictionaries();
      setDictionaries(page.data);
      setCanCreate(page.canCreate);
    } catch (e) {
      notifications.show({ message: e instanceof Error ? e.message : String(e), color: 'red' });
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDictionaries(); }, [fetchDictionaries]);

  const handleUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setUploading(true);
    try {
      const dictionary = await uploadDictionary(file);
      notifications.show({ message: t('natDictImported_msg', dictionary.name, dictionary.entryCount.toLocaleString()), color: 'green' });
      setUploadOpen(false);
      fetchDictionaries();
    } catch (e) { notifications.show({ message: e instanceof Error ? e.message : 'Upload failed.', color: 'red' }); }
    finally { setUploading(false); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(t('natDictDeleteConfirm', name))) return;
    try {
      await deleteDictionary(id);
      notifications.show({ message: t('dictDeleted'), color: 'green' });
      fetchDictionaries();
    } catch (e) { notifications.show({ message: e instanceof Error ? e.message : String(e), color: 'red' }); }
  };

  const handleLookup = async (word?: string) => {
    const w = (word || lookupWord).trim();
    if (!w) return;
    try {
      setLookupResults({ headword: w, entries: await lookupInDictionaries(w) });
    } catch (e) { notifications.show({ message: e instanceof Error ? e.message : String(e), color: 'red' }); }
  };

  const handleSuggest = async (val: string) => {
    setLookupWord(val);
    if (val.trim().length < 2) { setSuggestions([]); return; }
    try {
      setSuggestions(await suggestHeadwords(val.trim(), 8));
    } catch { setSuggestions([]); }
  };

  // Show browser if a dictionary is selected
  if (activeDictionaryId) {
    const dict = dictionaries.find(d => String(d.id) === activeDictionaryId);
    return (
      <DictionaryBrowser
        dictionaryId={activeDictionaryId}
        dictionaryName={dict?.name || 'Dictionary'}
        urlParams={urlParams}
        onUpdateParams={updateParams}
        onBack={onBackToList}
      />
    );
  }

  const totalEntries = dictionaries.reduce((s, d) => s + d.entryCount, 0);

  return (
    <Paper shadow="xs" p="lg" radius="md" withBorder>
      <Stack gap="md">
        <Group gap="lg">
          <Text size="sm"><strong>{dictionaries.length}</strong> {t('natDictDictionaries')}</Text>
          <Text size="sm" c="dimmed">{totalEntries.toLocaleString()} {t('natDictTotalEntries')}</Text>
        </Group>

        <Group>
          <Autocomplete
            placeholder={t('natDictLookupPlaceholder')}
            leftSection={<IconSearch size={14} />}
            value={lookupWord}
            onChange={handleSuggest}
            onOptionSubmit={(v) => { setLookupWord(v); handleLookup(v); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleLookup(); }}
            data={suggestions}
            style={{ flex: 1 }}
          />
          <Button onClick={() => handleLookup()}>{t('natDictLookup')}</Button>
          {canCreate && (
            <Button leftSection={<IconUpload size={14} />} variant="light" onClick={() => setUploadOpen(true)}>
              {t('natDictUpload')}
            </Button>
          )}
        </Group>

        {lookupResults && (
          <Paper p="md" withBorder radius="md" bg="var(--mantine-color-body)">
            <Group justify="space-between" mb="xs">
              <Text fw={600}>{t('natDictResultsFor')} "{lookupResults.headword}"</Text>
              <Button variant="subtle" size="compact-xs" onClick={() => setLookupResults(null)}>{t('natDictClose')}</Button>
            </Group>
            {lookupResults.entries.length === 0 && <Text c="dimmed" size="sm">{t('natDictNoResults')}</Text>}
            {lookupResults.entries.map((entry, i) => (
              <Paper key={i} p="sm" mb="xs" withBorder radius="sm">
                <Text size="xs" fw={600} c="accent" tt="uppercase" mb={4}>{entry.dictionaryName}</Text>
                <ArticleView article={entry} />
              </Paper>
            ))}
          </Paper>
        )}

        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('natDictName')}</Table.Th>
              <Table.Th>{t('natDictFormat')}</Table.Th>
              <Table.Th>{t('natDictEntries')}</Table.Th>
              <Table.Th>{t('natDictLanguages')}</Table.Th>
              <Table.Th>{t('natDictImported')}</Table.Th>
              <Table.Th w={140}>{t('dictActions')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {dictionaries.map((d) => (
              <Table.Tr key={d.id}>
                <Table.Td>
                  <Text fw={500}>{d.name}</Text>
                  {d.description && <Text size="xs" c="dimmed">{d.description}</Text>}
                </Table.Td>
                <Table.Td><Badge variant="light" size="sm">{d.format}</Badge></Table.Td>
                <Table.Td>{d.entryCount.toLocaleString()}</Table.Td>
                <Table.Td>{[d.sourceLanguage, d.targetLanguage].filter(Boolean).join(' → ') || '—'}</Table.Td>
                <Table.Td>{new Date(d.dateCreated).toLocaleDateString()}</Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    <Button size="compact-xs" variant="light" leftSection={<IconBook size={12} />} onClick={() => onBrowse(String(d.id))}>{t('natDictBrowse')}</Button>
                    {d.canEdit && <Button size="compact-xs" variant="light" color="red" onClick={() => handleDelete(d.id, d.name)}><IconTrash size={12} /></Button>}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
            {dictionaries.length === 0 && !loading && (
              <Table.Tr><Table.Td colSpan={6}><Text ta="center" c="dimmed" py="lg">{t('natDictNoDicts')}</Text></Table.Td></Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Stack>

      <Modal opened={uploadOpen} onClose={() => setUploadOpen(false)} title={t('natDictUpload')} size="lg">
        <Stack gap="md">
          <Text size="sm" c="dimmed">{t('natDictUploadDesc')}</Text>
          <Dropzone onDrop={handleUpload} loading={uploading} maxSize={300 * 1024 * 1024}>
            <Stack align="center" gap="xs" py="xl">
              <IconUpload size={40} color="gray" />
              <Text size="sm">{t('natDictDropzoneText')}</Text>
              <Text size="xs" c="dimmed">{t('natDictDropzoneHint')}</Text>
            </Stack>
          </Dropzone>
        </Stack>
      </Modal>
    </Paper>
  );
}
