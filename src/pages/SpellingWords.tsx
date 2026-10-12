import { useState, useEffect, useCallback, useRef } from 'react';
import { Paper, Table, Group, Button, TextInput, Stack, Text, SegmentedControl, Pagination, FileButton } from '@mantine/core';
import { IconSearch, IconPlus, IconTrash, IconUpload, IconDownload } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useI18n } from '../i18n';
import {
  addSpellingWord, deleteSpellingWord, getSpellingWords, spellingWordsExportUrl, uploadSpellingWords,
  type SpellingWord,
} from '../api/languageTools';

// The spelling dictionary: one word list per language, used by the spell checker.
const LANGUAGES = {
  ur: { dir: 'rtl' as const, fontFamily: "'Urdu UI', inherit" },
  hi: { dir: 'ltr' as const, fontFamily: "'Noto Sans Devanagari', sans-serif" },
  en: { dir: 'ltr' as const, fontFamily: 'inherit' },
};
type Language = keyof typeof LANGUAGES;
const PAGE_SIZE = 50;

export default function SpellingWords() {
  const { t } = useI18n();
  const [language, setLanguage] = useState<Language>('ur');
  const [words, setWords] = useState<SpellingWord[]>([]);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [page, setPage] = useState(1);
  const [canCreate, setCanCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [newWord, setNewWord] = useState('');
  const [uploading, setUploading] = useState(false);
  const resetUpload = useRef<() => void>(null);
  const script = LANGUAGES[language];

  const fail = (e: unknown) => notifications.show({ message: e instanceof Error ? e.message : String(e), color: 'red' });

  const fetchWords = useCallback(async (p: number) => {
    try {
      const result = await getSpellingWords(language, search, p, PAGE_SIZE);
      setWords(result.data);
      setTotal(result.totalCount);
      setPageCount(result.pageCount);
      setPage(p);
      setCanCreate(result.canCreate);
    } catch (e) {
      setWords([]);
      fail(e);
    }
  }, [language, search]);

  useEffect(() => { fetchWords(1); }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async () => {
    const word = newWord.trim();
    if (!word) return;
    try {
      await addSpellingWord(language, word);
      setNewWord('');
      notifications.show({ message: t('spellingWordAdded', word), color: 'green' });
      fetchWords(page);
    } catch (e) { fail(e); }
  };

  const handleDelete = async (w: SpellingWord) => {
    if (!window.confirm(t('spellingDeleteConfirm', w.word))) return;
    try {
      await deleteSpellingWord(language, w.id);
      fetchWords(page);
    } catch (e) { fail(e); }
  };

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadSpellingWords(language, file);
      notifications.show({ message: t('spellingImported', result.added, result.skipped), color: 'green' });
      fetchWords(1);
    } catch (e) { fail(e); }
    finally { setUploading(false); resetUpload.current?.(); }
  };

  return (
    <Paper shadow="xs" p="lg" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <SegmentedControl
            value={language}
            onChange={(v) => { setLanguage(v as Language); setSearch(''); }}
            data={[{ value: 'ur', label: t('dictUrdu') }, { value: 'hi', label: t('dictHindi') }, { value: 'en', label: 'English' }]}
          />
          <Group gap="xs">
            <Text size="sm"><strong>{total.toLocaleString()}</strong> {t('dictWords')}</Text>
            <Button component="a" href={spellingWordsExportUrl(language)} download size="compact-sm" variant="light" leftSection={<IconDownload size={14} />}>
              {t('spellingExport')}
            </Button>
            {canCreate && (
              <FileButton onChange={handleUpload} accept=".txt,.dic,text/plain" resetRef={resetUpload}>
                {(props) => (
                  <Button {...props} size="compact-sm" variant="light" loading={uploading} leftSection={<IconUpload size={14} />}>
                    {t('spellingUpload')}
                  </Button>
                )}
              </FileButton>
            )}
          </Group>
        </Group>

        <Group>
          <TextInput placeholder={t('dictSearchPlaceholder')} leftSection={<IconSearch size={14} />} value={search} onChange={(e) => setSearch(e.currentTarget.value)} onKeyDown={(e) => { if (e.key === 'Enter') fetchWords(1); }} style={{ flex: 1 }} />
          {canCreate && (
            <>
              <TextInput placeholder={t('spellingNewWord')} dir={script.dir} value={newWord} onChange={(e) => setNewWord(e.currentTarget.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }} />
              <Button leftSection={<IconPlus size={14} />} onClick={handleAdd}>{t('dictAddWord')}</Button>
            </>
          )}
        </Group>

        <Table striped highlightOnHover withTableBorder>
          <Table.Tbody>
            {words.map((w) => (
              <Table.Tr key={w.id}>
                <Table.Td dir={script.dir} style={{ fontFamily: script.fontFamily }}>{w.word}</Table.Td>
                <Table.Td w={60}>
                  {w.canDelete && (
                    <Button variant="subtle" size="compact-xs" color="red" onClick={() => handleDelete(w)}><IconTrash size={14} /></Button>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
            {words.length === 0 && (
              <Table.Tr><Table.Td colSpan={2}><Text ta="center" c="dimmed" py="lg">{t('dictNoEntries')}</Text></Table.Td></Table.Tr>
            )}
          </Table.Tbody>
        </Table>

        {pageCount > 1 && (
          <Group justify="center">
            <Pagination value={page} total={pageCount} onChange={fetchWords} size="sm" />
          </Group>
        )}
      </Stack>
    </Paper>
  );
}
