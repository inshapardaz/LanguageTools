import { useState, useEffect, useCallback } from 'react';
import { Paper, Table, Group, Button, TextInput, Modal, Stack, Badge, Text, SegmentedControl } from '@mantine/core';
import { IconSearch, IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useI18n } from '../i18n';
import {
  addTransliterationEntry, deleteTransliterationEntry, getTransliterationEntries, updateTransliterationEntry,
  type TransliterationEntry,
} from '../api/languageTools';

// The transliteration dictionary: per language, romanised spellings that should convert to a known
// native spelling instead of the rule-based result.
const LANGUAGES = {
  ur: { dir: 'rtl' as const, fontFamily: "'Urdu UI', inherit" },
  hi: { dir: 'ltr' as const, fontFamily: "'Noto Sans Devanagari', sans-serif" },
};
type Language = keyof typeof LANGUAGES;

const emptyForm = { roman: '', native: '', meaning: '', category: '' };

export default function DictionaryManager() {
  const { t } = useI18n();
  const [language, setLanguage] = useState<Language>('ur');
  const [entries, setEntries] = useState<TransliterationEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [canCreate, setCanCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<TransliterationEntry | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const nativeLabel = language === 'ur' ? t('dictUrdu') : t('dictHindi');
  const script = LANGUAGES[language];

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const page = await getTransliterationEntries(language, search);
      setEntries(page.data);
      setTotal(page.totalCount);
      setCanCreate(page.canCreate);
    } catch (e) {
      setEntries([]);
      notifications.show({ message: e instanceof Error ? e.message : String(e), color: 'red' });
    } finally {
      setLoading(false);
    }
  }, [language, search]);

  useEffect(() => { fetchEntries(); }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  const openAdd = () => { setEditEntry(null); setFormData(emptyForm); setFormOpen(true); };
  const openEdit = (e: TransliterationEntry) => {
    setEditEntry(e);
    setFormData({ roman: e.roman, native: e.native, meaning: e.meaning || '', category: e.category || '' });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.roman.trim() || !formData.native.trim()) return;
    const entry = { ...formData, meaning: formData.meaning || null, category: formData.category || null };
    try {
      if (editEntry) await updateTransliterationEntry(language, editEntry.id, entry);
      else await addTransliterationEntry(language, entry);
      notifications.show({ message: editEntry ? t('dictEntryUpdated') : t('dictEntryAdded'), color: 'green' });
      setFormOpen(false);
      fetchEntries();
    } catch (e) {
      notifications.show({ message: e instanceof Error ? e.message : String(e), color: 'red' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('dictDeleteConfirm'))) return;
    try {
      await deleteTransliterationEntry(language, id);
      notifications.show({ message: t('dictDeleted'), color: 'green' });
      fetchEntries();
    } catch (e) {
      notifications.show({ message: e instanceof Error ? e.message : String(e), color: 'red' });
    }
  };

  return (
    <Paper shadow="xs" p="lg" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <SegmentedControl
            value={language}
            onChange={(v) => setLanguage(v as Language)}
            data={[{ value: 'ur', label: t('dictUrdu') }, { value: 'hi', label: t('dictHindi') }]}
          />
          <Text size="sm"><strong>{total}</strong> {t('dictWords')}</Text>
        </Group>

        <Group>
          <TextInput placeholder={t('dictSearchPlaceholder')} leftSection={<IconSearch size={14} />} value={search} onChange={(e) => setSearch(e.currentTarget.value)} onKeyDown={(e) => { if (e.key === 'Enter') fetchEntries(); }} style={{ flex: 1 }} />
          {canCreate && <Button leftSection={<IconPlus size={14} />} onClick={openAdd}>{t('dictAddWord')}</Button>}
        </Group>

        <Table striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('dictRoman')}</Table.Th>
              <Table.Th>{nativeLabel}</Table.Th>
              <Table.Th>{t('dictMeaning')}</Table.Th>
              <Table.Th>{t('dictCategory')}</Table.Th>
              <Table.Th w={100}>{t('dictActions')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {entries.map((e) => (
              <Table.Tr key={e.id}>
                <Table.Td>{e.roman}</Table.Td>
                <Table.Td dir={script.dir} style={{ fontFamily: script.fontFamily }}>{e.native}</Table.Td>
                <Table.Td>{e.meaning}</Table.Td>
                <Table.Td>{e.category && <Badge variant="light" size="sm">{e.category}</Badge>}</Table.Td>
                <Table.Td>
                  {e.canEdit && (
                    <Group gap={4}>
                      <Button variant="subtle" size="compact-xs" onClick={() => openEdit(e)}><IconEdit size={14} /></Button>
                      <Button variant="subtle" size="compact-xs" color="red" onClick={() => handleDelete(e.id)}><IconTrash size={14} /></Button>
                    </Group>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
            {entries.length === 0 && !loading && (
              <Table.Tr><Table.Td colSpan={5}><Text ta="center" c="dimmed" py="lg">{t('dictNoEntries')}</Text></Table.Td></Table.Tr>
            )}
          </Table.Tbody>
        </Table>
        {entries.length < total && <Text size="xs" c="dimmed" ta="center">{t('dictShowing', entries.length, total)}</Text>}
      </Stack>

      <Modal opened={formOpen} onClose={() => setFormOpen(false)} title={editEntry ? t('dictEditEntry') : t('dictAddEntry')}>
        <Stack gap="sm">
          <TextInput label={`${t('dictRoman')} *`} required value={formData.roman} onChange={(e) => setFormData({ ...formData, roman: e.currentTarget.value })} />
          <TextInput label={`${nativeLabel} *`} required dir={script.dir} value={formData.native} onChange={(e) => setFormData({ ...formData, native: e.currentTarget.value })} />
          <TextInput label={t('dictMeaning')} value={formData.meaning} onChange={(e) => setFormData({ ...formData, meaning: e.currentTarget.value })} />
          <TextInput label={t('dictCategory')} value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.currentTarget.value })} />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setFormOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleSubmit}>{editEntry ? t('editorUpdate') : t('dictAddWord')}</Button>
          </Group>
        </Stack>
      </Modal>
    </Paper>
  );
}
