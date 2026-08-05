import { useState, useEffect, useCallback } from 'react';
import { Paper, Table, Group, Button, TextInput, Modal, Stack, Badge, Text } from '@mantine/core';
import { IconSearch, IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useI18n } from '../i18n';

interface DictEntry {
  id: string;
  roman: string;
  urdu?: string;
  hindi?: string;
  meaning?: string;
  category?: string;
}

export default function DictionaryManager() {
  const { t } = useI18n();
  const [entries, setEntries] = useState<DictEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState<{ total: number; withUrdu: number; withHindi: number } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<DictEntry | null>(null);
  const [formData, setFormData] = useState({ roman: '', urdu: '', hindi: '', meaning: '', category: '' });
  const [loading, setLoading] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const q = search ? `?q=${encodeURIComponent(search)}&limit=100` : '?limit=100';
      const res = await fetch(`/api/dictionary${q}`);
      const data = await res.json();
      setEntries(data.entries || []);
      setTotal(data.total || 0);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [search]);

  const fetchStats = async () => {
    try { const res = await fetch('/api/dictionary/stats'); setStats(await res.json()); } catch { /* ignore */ }
  };

  useEffect(() => { fetchEntries(); fetchStats(); }, [fetchEntries]);

  const openAdd = () => { setEditEntry(null); setFormData({ roman: '', urdu: '', hindi: '', meaning: '', category: '' }); setFormOpen(true); };
  const openEdit = (e: DictEntry) => { setEditEntry(e); setFormData({ roman: e.roman, urdu: e.urdu || '', hindi: e.hindi || '', meaning: e.meaning || '', category: e.category || '' }); setFormOpen(true); };

  const handleSubmit = async () => {
    if (!formData.roman.trim()) return;
    const url = editEntry ? `/api/dictionary/${editEntry.id}` : '/api/dictionary';
    const method = editEntry ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
    if (res.ok) {
      notifications.show({ message: editEntry ? t('dictEntryUpdated') : t('dictEntryAdded'), color: 'green' });
      setFormOpen(false); fetchEntries(); fetchStats();
    } else {
      const d = await res.json().catch(() => ({}));
      notifications.show({ message: d.error || 'Failed.', color: 'red' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('dictDeleteConfirm'))) return;
    const res = await fetch(`/api/dictionary/${id}`, { method: 'DELETE' });
    if (res.ok) { notifications.show({ message: t('dictDeleted'), color: 'green' }); fetchEntries(); fetchStats(); }
  };

  return (
    <Paper shadow="xs" p="lg" radius="md" withBorder>
      <Stack gap="md">
        {stats && (
          <Group gap="lg">
            <Text size="sm"><strong>{stats.total}</strong> {t('dictWords')}</Text>
            <Text size="sm" c="dimmed">{stats.withUrdu} {t('dictWithUrdu')}</Text>
            <Text size="sm" c="dimmed">{stats.withHindi} {t('dictWithHindi')}</Text>
          </Group>
        )}

        <Group>
          <TextInput placeholder={t('dictSearchPlaceholder')} leftSection={<IconSearch size={14} />} value={search} onChange={(e) => setSearch(e.currentTarget.value)} onKeyDown={(e) => { if (e.key === 'Enter') fetchEntries(); }} style={{ flex: 1 }} />
          <Button leftSection={<IconPlus size={14} />} onClick={openAdd}>{t('dictAddWord')}</Button>
        </Group>

        <Table striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('dictRoman')}</Table.Th>
              <Table.Th>{t('dictUrdu')}</Table.Th>
              <Table.Th>{t('dictHindi')}</Table.Th>
              <Table.Th>{t('dictMeaning')}</Table.Th>
              <Table.Th>{t('dictCategory')}</Table.Th>
              <Table.Th w={100}>{t('dictActions')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {entries.map((e) => (
              <Table.Tr key={e.id}>
                <Table.Td>{e.roman}</Table.Td>
                <Table.Td dir="rtl" style={{ fontFamily: "'Urdu UI', inherit" }}>{e.urdu}</Table.Td>
                <Table.Td style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}>{e.hindi}</Table.Td>
                <Table.Td>{e.meaning}</Table.Td>
                <Table.Td>{e.category && <Badge variant="light" size="sm">{e.category}</Badge>}</Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    <Button variant="subtle" size="compact-xs" onClick={() => openEdit(e)}><IconEdit size={14} /></Button>
                    <Button variant="subtle" size="compact-xs" color="red" onClick={() => handleDelete(e.id)}><IconTrash size={14} /></Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
            {entries.length === 0 && !loading && (
              <Table.Tr><Table.Td colSpan={6}><Text ta="center" c="dimmed" py="lg">{t('dictNoEntries')}</Text></Table.Td></Table.Tr>
            )}
          </Table.Tbody>
        </Table>
        {entries.length < total && <Text size="xs" c="dimmed" ta="center">{t('dictShowing', entries.length, total)}</Text>}
      </Stack>

      <Modal opened={formOpen} onClose={() => setFormOpen(false)} title={editEntry ? t('dictEditEntry') : t('dictAddEntry')}>
        <Stack gap="sm">
          <TextInput label={`${t('dictRoman')} *`} required value={formData.roman} onChange={(e) => setFormData({ ...formData, roman: e.currentTarget.value })} />
          <TextInput label={t('dictUrdu')} dir="rtl" value={formData.urdu} onChange={(e) => setFormData({ ...formData, urdu: e.currentTarget.value })} />
          <TextInput label={t('dictHindi')} value={formData.hindi} onChange={(e) => setFormData({ ...formData, hindi: e.currentTarget.value })} />
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
