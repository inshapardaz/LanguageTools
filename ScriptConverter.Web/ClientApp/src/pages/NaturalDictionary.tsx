import { useState, useEffect, useCallback } from 'react';
import { Paper, Table, Group, Button, TextInput, Modal, Stack, Badge, Text, Alert, Autocomplete } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { IconSearch, IconUpload, IconTrash, IconBook } from '@tabler/icons-react';
import { updateParams } from '../router';
import DictionaryBrowser from './DictionaryBrowser';
import ArticleView from '../components/ArticleView';

interface DictInfo {
  id: string;
  name: string;
  format: string;
  entryCount: number;
  sourceLanguage?: string;
  targetLanguage?: string;
  originalFileName?: string;
  importedAt: string;
}

interface Props {
  activeDictionaryId: string | null;
  urlParams: Record<string, string>;
  onBrowse: (id: string) => void;
  onBackToList: () => void;
}

export default function NaturalDictionary({ activeDictionaryId, urlParams, onBrowse, onBackToList }: Props) {
  const [dictionaries, setDictionaries] = useState<DictInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [lookupWord, setLookupWord] = useState('');
  const [lookupResults, setLookupResults] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const fetchDictionaries = useCallback(async () => {
    try {
      const res = await fetch('/api/natural-dictionary');
      const data = await res.json();
      setDictionaries(data.dictionaries || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDictionaries(); }, [fetchDictionaries]);

  const handleUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/natural-dictionary/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) { notifications.show({ message: data.error || 'Upload failed.', color: 'red' }); return; }
      notifications.show({ message: `Imported "${data.dictionary.name}" with ${data.dictionary.entryCount.toLocaleString()} entries.`, color: 'green' });
      setUploadOpen(false);
      fetchDictionaries();
    } catch { notifications.show({ message: 'Upload failed.', color: 'red' }); }
    finally { setUploading(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    const res = await fetch(`/api/natural-dictionary/${id}`, { method: 'DELETE' });
    if (res.ok) { notifications.show({ message: `Deleted "${name}".`, color: 'green' }); fetchDictionaries(); }
  };

  const handleLookup = async (word?: string) => {
    const w = (word || lookupWord).trim();
    if (!w) return;
    const res = await fetch(`/api/natural-dictionary/lookup?word=${encodeURIComponent(w)}`);
    setLookupResults(await res.json());
  };

  const handleSuggest = async (val: string) => {
    setLookupWord(val);
    if (val.trim().length < 2) { setSuggestions([]); return; }
    try {
      const res = await fetch(`/api/natural-dictionary/suggest?prefix=${encodeURIComponent(val.trim())}&limit=8`);
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch { setSuggestions([]); }
  };

  // Show browser if a dictionary is selected
  if (activeDictionaryId) {
    const dict = dictionaries.find(d => d.id === activeDictionaryId);
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
          <Text size="sm"><strong>{dictionaries.length}</strong> dictionaries</Text>
          <Text size="sm" c="dimmed">{totalEntries.toLocaleString()} total entries</Text>
        </Group>

        <Group>
          <Autocomplete
            placeholder="Look up a word..."
            leftSection={<IconSearch size={14} />}
            value={lookupWord}
            onChange={handleSuggest}
            onOptionSubmit={(v) => { setLookupWord(v); handleLookup(v); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleLookup(); }}
            data={suggestions}
            style={{ flex: 1 }}
          />
          <Button onClick={() => handleLookup()}>Lookup</Button>
          <Button leftSection={<IconUpload size={14} />} variant="light" onClick={() => setUploadOpen(true)}>
            Upload Dictionary
          </Button>
        </Group>

        {lookupResults && (
          <Paper p="md" withBorder radius="md" bg="gray.0">
            <Group justify="space-between" mb="xs">
              <Text fw={600}>Results for "{lookupResults.headword}"</Text>
              <Button variant="subtle" size="compact-xs" onClick={() => setLookupResults(null)}>Close</Button>
            </Group>
            {lookupResults.entries.length === 0 && <Text c="dimmed" size="sm">No entries found.</Text>}
            {lookupResults.entries.map((entry: any, i: number) => (
              <Paper key={i} p="sm" mb="xs" withBorder radius="sm">
                <Text size="xs" fw={600} c="blue" tt="uppercase" mb={4}>{entry.dictionaryName}</Text>
                <ArticleView article={entry} />
              </Paper>
            ))}
          </Paper>
        )}

        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Format</Table.Th>
              <Table.Th>Entries</Table.Th>
              <Table.Th>Languages</Table.Th>
              <Table.Th>Imported</Table.Th>
              <Table.Th w={140}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {dictionaries.map((d) => (
              <Table.Tr key={d.id}>
                <Table.Td>
                  <Text fw={500}>{d.name}</Text>
                  {d.originalFileName && <Text size="xs" c="dimmed">{d.originalFileName}</Text>}
                </Table.Td>
                <Table.Td><Badge variant="light" size="sm">{d.format}</Badge></Table.Td>
                <Table.Td>{d.entryCount.toLocaleString()}</Table.Td>
                <Table.Td>{[d.sourceLanguage, d.targetLanguage].filter(Boolean).join(' → ') || '—'}</Table.Td>
                <Table.Td>{new Date(d.importedAt).toLocaleDateString()}</Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    <Button size="compact-xs" variant="light" leftSection={<IconBook size={12} />} onClick={() => onBrowse(d.id)}>Browse</Button>
                    <Button size="compact-xs" variant="light" color="red" onClick={() => handleDelete(d.id, d.name)}><IconTrash size={12} /></Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
            {dictionaries.length === 0 && !loading && (
              <Table.Tr><Table.Td colSpan={6}><Text ta="center" c="dimmed" py="lg">No dictionaries uploaded yet.</Text></Table.Td></Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Stack>

      <Modal opened={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Dictionary" size="lg">
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Upload a GoldenDict-compatible dictionary (.zip containing StarDict or DSL files).
          </Text>
          <Dropzone onDrop={handleUpload} loading={uploading} accept={['application/zip', 'application/gzip', 'application/x-tar']}>
            <Stack align="center" gap="xs" py="xl">
              <IconUpload size={40} color="gray" />
              <Text size="sm">Drag a dictionary archive here or click to browse</Text>
              <Text size="xs" c="dimmed">Supports .zip, .tar.gz</Text>
            </Stack>
          </Dropzone>
        </Stack>
      </Modal>
    </Paper>
  );
}
