import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Paper, Table, Group, Button, TextInput, Stack, Text, SegmentedControl, Pagination, FileButton, Modal, Switch, Badge, Select,
} from '@mantine/core';
import { IconSearch, IconPlus, IconTrash, IconUpload, IconDownload, IconEdit } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useI18n } from '../i18n';
import { useAuth } from '../auth';
import { updateParams } from '../router';
import {
  addCorrection, correctionsExportUrl, deleteCorrection, getCorrections, importCorrections, updateCorrection,
  type Correction, type CorrectionInput, type CorrectionProfile,
} from '../api/languageTools';

// The autocorrect and punctuation lists, per language. Editors (writers in any library, dictionary
// writers, admins) maintain them; the API's links say who may change what. Bulk import replaces
// entries wholesale, so it is only offered to people who manage the language tools.
const LANGUAGES = {
  ur: { dir: 'rtl' as const, fontFamily: "'Urdu UI', inherit" },
  hi: { dir: 'ltr' as const, fontFamily: "'Noto Sans Devanagari', sans-serif" },
  en: { dir: 'ltr' as const, fontFamily: 'inherit' },
};
type Language = keyof typeof LANGUAGES;
type SortBy = 'incorrectText' | 'usage';
const PAGE_SIZE = 50;
const emptyForm: CorrectionInput = { incorrectText: '', correctText: '', completeWord: true };

interface Props {
  urlParams: Record<string, string>;
}

export default function Corrections({ urlParams }: Props) {
  const { t } = useI18n();
  const { canManage } = useAuth();
  const [profile, setProfile] = useState<CorrectionProfile>(urlParams.profile === 'punctuation' ? 'punctuation' : 'autocorrect');
  const [language, setLanguage] = useState<Language>(urlParams.language in LANGUAGES ? urlParams.language as Language : 'ur');
  const [sortBy, setSortBy] = useState<SortBy>('incorrectText');
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [page, setPage] = useState(1);
  const [canCreate, setCanCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Correction | 'new' | null>(null);
  const [form, setForm] = useState<CorrectionInput>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const resetUpload = useRef<() => void>(null);
  const script = LANGUAGES[language];

  const fail = (e: unknown) => notifications.show({ message: e instanceof Error ? e.message : String(e), color: 'red' });

  const fetchCorrections = useCallback(async (p: number) => {
    try {
      const result = await getCorrections(language, profile, search, p, PAGE_SIZE, sortBy);
      setCorrections(result.data);
      setTotal(result.totalCount);
      setPageCount(result.pageCount);
      setPage(p);
      setCanCreate(result.canCreate);
    } catch (e) {
      setCorrections([]);
      fail(e);
    }
  }, [language, profile, search, sortBy]);

  // Keep the list and language in the URL, so links from library-editor open the right list.
  useEffect(() => {
    updateParams({ profile, language });
    fetchCorrections(1);
  }, [profile, language, sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  const openAdd = () => { setForm(emptyForm); setEditing('new'); };
  const openEdit = (c: Correction) => { setForm({ incorrectText: c.incorrectText, correctText: c.correctText, completeWord: c.completeWord }); setEditing(c); };

  const handleSave = async () => {
    if (!form.incorrectText || !form.correctText) return;
    if (form.incorrectText === form.correctText) {
      notifications.show({ message: t('correctionsSameText'), color: 'red' });
      return;
    }
    try {
      if (editing === 'new') await addCorrection(language, profile, form);
      else if (editing) await updateCorrection(language, profile, editing.id, form);
      notifications.show({ message: t('correctionsSaved'), color: 'green' });
      setEditing(null);
      fetchCorrections(editing === 'new' ? 1 : page);
    } catch (e) { fail(e); }
  };

  const handleDelete = async (c: Correction) => {
    if (!window.confirm(t('correctionsDeleteConfirm', c.incorrectText))) return;
    try {
      await deleteCorrection(language, profile, c.id);
      fetchCorrections(page);
    } catch (e) { fail(e); }
  };

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const result = await importCorrections(language, profile, file);
      notifications.show({ message: t('correctionsImported', result.added, result.updated ?? 0, result.skipped), color: 'green' });
      fetchCorrections(1);
    } catch (e) { fail(e); }
    finally { setUploading(false); resetUpload.current?.(); }
  };

  return (
    <Paper shadow="xs" p="lg" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Group>
            <SegmentedControl
              value={profile}
              onChange={(v) => { setProfile(v as CorrectionProfile); setSearch(''); }}
              data={[{ value: 'autocorrect', label: t('correctionsAutocorrect') }, { value: 'punctuation', label: t('correctionsPunctuation') }]}
            />
            <SegmentedControl
              value={language}
              onChange={(v) => { setLanguage(v as Language); setSearch(''); }}
              data={[{ value: 'ur', label: t('dictUrdu') }, { value: 'hi', label: t('dictHindi') }, { value: 'en', label: 'English' }]}
            />
          </Group>
          <Group gap="xs">
            <Text size="sm"><strong>{total.toLocaleString()}</strong> {t('correctionsCount')}</Text>
            <Button component="a" href={correctionsExportUrl(language, profile)} download size="compact-sm" variant="light" leftSection={<IconDownload size={14} />}>
              {t('spellingExport')}
            </Button>
            {canManage && (
              <FileButton onChange={handleUpload} accept=".json,application/json" resetRef={resetUpload}>
                {(props) => (
                  <Button {...props} size="compact-sm" variant="light" loading={uploading} leftSection={<IconUpload size={14} />}>
                    {t('correctionsImport')}
                  </Button>
                )}
              </FileButton>
            )}
          </Group>
        </Group>

        <Group>
          <TextInput placeholder={t('dictSearchPlaceholder')} leftSection={<IconSearch size={14} />} value={search} onChange={(e) => setSearch(e.currentTarget.value)} onKeyDown={(e) => { if (e.key === 'Enter') fetchCorrections(1); }} style={{ flex: 1 }} />
          <Select
            w={180}
            value={sortBy}
            onChange={(v) => setSortBy((v as SortBy) ?? 'incorrectText')}
            data={[{ value: 'incorrectText', label: t('correctionsSortText') }, { value: 'usage', label: t('correctionsSortUsage') }]}
            allowDeselect={false}
          />
          {canCreate && <Button leftSection={<IconPlus size={14} />} onClick={openAdd}>{t('correctionsAdd')}</Button>}
        </Group>

        <Table striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('correctionsIncorrect')}</Table.Th>
              <Table.Th>{t('correctionsCorrect')}</Table.Th>
              <Table.Th w={130}>{t('correctionsCompleteWord')}</Table.Th>
              <Table.Th w={90}>{t('correctionsUsage')}</Table.Th>
              <Table.Th w={100}>{t('dictActions')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {corrections.map((c) => (
              <Table.Tr key={c.id}>
                <Table.Td dir={script.dir} style={{ fontFamily: script.fontFamily, whiteSpace: 'pre' }}>{c.incorrectText}</Table.Td>
                <Table.Td dir={script.dir} style={{ fontFamily: script.fontFamily, whiteSpace: 'pre' }}>{c.correctText}</Table.Td>
                <Table.Td>{c.completeWord && <Badge variant="light" size="sm">{t('correctionsCompleteWord')}</Badge>}</Table.Td>
                <Table.Td>{c.usage.toLocaleString()}</Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    {c.canEdit && <Button variant="subtle" size="compact-xs" onClick={() => openEdit(c)}><IconEdit size={14} /></Button>}
                    {c.canDelete && <Button variant="subtle" size="compact-xs" color="red" onClick={() => handleDelete(c)}><IconTrash size={14} /></Button>}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
            {corrections.length === 0 && (
              <Table.Tr><Table.Td colSpan={5}><Text ta="center" c="dimmed" py="lg">{t('dictNoEntries')}</Text></Table.Td></Table.Tr>
            )}
          </Table.Tbody>
        </Table>

        {pageCount > 1 && (
          <Group justify="center">
            <Pagination value={page} total={pageCount} onChange={fetchCorrections} size="sm" />
          </Group>
        )}
      </Stack>

      <Modal opened={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? t('correctionsAdd') : t('correctionsEdit')}>
        <Stack gap="sm">
          <TextInput label={`${t('correctionsIncorrect')} *`} required dir={script.dir} value={form.incorrectText} onChange={(e) => setForm({ ...form, incorrectText: e.currentTarget.value })} />
          <TextInput label={`${t('correctionsCorrect')} *`} required dir={script.dir} value={form.correctText} onChange={(e) => setForm({ ...form, correctText: e.currentTarget.value })} />
          <Switch label={t('correctionsCompleteWordHint')} checked={form.completeWord} onChange={(e) => setForm({ ...form, completeWord: e.currentTarget.checked })} />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setEditing(null)}>{t('cancel')}</Button>
            <Button onClick={handleSave}>{t('save')}</Button>
          </Group>
        </Stack>
      </Modal>
    </Paper>
  );
}
