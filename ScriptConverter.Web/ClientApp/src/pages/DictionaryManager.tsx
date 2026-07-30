import { useState, useEffect, useCallback } from 'react';
import { Paper, Table, Group, Button, TextInput, Modal, Stack, Badge, Text, Alert } from '@mantine/core';
import { IconSearch, IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface DictEntry {
  id: string;
  roman: string;
  urdu?: string;
  hindi?: string;
  meaning?: string;
  category?: string;
}

export default function DictionaryManager() {
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
    try {
      const res = await fetch('/api/dictionary/stats');
      setStats(await res.json());
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchEntries(); fetchStats(); }, [fetchEntries]);

  const openAdd = () => {
    setEditEntry(null);
    setFormData({ roman: '', urdu: '', hindi: '', meaning: '', category: '' });
    setFormOpen(true);
  };

  const openEdit = (e: DictEntry) => {
    setEditEntry(e);
    setFormData({ roman: e.roman, urdu: e.urdu || '', hindi: e.hindi || '', meaning: e.meaning || '', category: e.category || '' });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.roman.trim()) return;
    const url = editEntry ? `/api/dictionary/${editEntry.id}` : '/api/dictionary';
    const method = editEntry ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
    if (res.ok) {
      notifications.show({ message: editEntry ? 'Entry updated.' : 'Entry added.', color: 'green' });
      setFormOpen(false);
      fetchEntries();
      fetchStats();
    } else {
      const d = await res.json().catch(() => ({}));
      notifications.show({ message: d.error || 'Failed to save.', color: 'red' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this entry?')) return;
    const res = await fetch(`/api/dictionary/${id}`, { method: 'DELETE' });
    if (res.ok) { notifications.show({ message: 'Deleted.', color: 'green' }); fetchEntries(); fetchStats(); }
  };

  return (
    <Paper shadow="xs" p="lg" radius="md" withBorder>
      <Stack gap="md">
        {stats && (
          <Group gap="lg">
            <Text size="sm"><strong>{stats.total}</strong> words</Text>
            <Text size="sm" c="dimmed">{stats.withUrdu} with Urdu</Text>
            <Text size="sm" c="dimmed">{stats.withHindi} with Hindi</Text>
          </Group>
        )}

        <Group>
          <TextInput
            placeholder="Search words..."
            leftSection={<IconSearch size={14} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') fetchEntries(); }}
            style={{ flex: 1 }}
          />
          <Button leftSection={<IconPlus size={14} />} onClick={openAdd}>Add Word</Button>
        </Group>

        <Table striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Roman</Table.Th>
              <Table.Th>Urdu</Table.Th>
              <Table.Th>Hindi</Table.Th>
              <Table.Th>Meaning</Table.Th>
              <Table.Th>Category</Table.Th>
              <Table.Th w={100}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {entries.map((e) => (
              <Table.Tr key={e.id}>
                <Table.Td>{e.roman}</Table.Td>
                <Table.Td dir="rtl" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>{e.urdu}</Table.Td>
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
              <Table.Tr><Table.Td colSpan={6}><Text ta="center" c="dimmed" py="lg">No entries found.</Text></Table.Td></Table.Tr>
            )}
          </Table.Tbody>
        </Table>

        {entries.length < total && <Text size="xs" c="dimmed" ta="center">Showing {entries.length} of {total}</Text>}
      </Stack>

      <Modal opened={formOpen} onClose={() => setFormOpen(false)} title={editEntry ? 'Edit Entry' : 'Add Entry'}>
        <Stack gap="sm">
          <TextInput label="Roman *" required value={formData.roman} onChange={(e) => setFormData({ ...formData, roman: e.currentTarget.value })} placeholder="e.g. salam" />
          <TextInput label="Urdu" dir="rtl" value={formData.urdu} onChange={(e) => setFormData({ ...formData, urdu: e.currentTarget.value })} placeholder="e.g. سلام" />
          <TextInput label="Hindi" value={formData.hindi} onChange={(e) => setFormData({ ...formData, hindi: e.currentTarget.value })} placeholder="e.g. सलाम" />
          <TextInput label="Meaning" value={formData.meaning} onChange={(e) => setFormData({ ...formData, meaning: e.currentTarget.value })} placeholder="e.g. peace/hello" />
          <TextInput label="Category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.currentTarget.value })} placeholder="e.g. greeting, verb" />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editEntry ? 'Update' : 'Add'}</Button>
          </Group>
        </Stack>
      </Modal>
    </Paper>
  );
}
