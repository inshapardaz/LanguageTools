import { useState, useEffect } from 'react';
import { Modal, Stack, Text, Paper, Group, Button, Badge, ScrollArea, Alert } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconGitMerge } from '@tabler/icons-react';

interface Props {
  dictionaryId: string;
  onClose: () => void;
  onMergeComplete: () => void;
}

interface MergeGroup {
  baseHeadword: string;
  count: number;
  articles: { id: number; headword: string; sensesCount: number; meaningsCount: number }[];
}

export default function MergeDuplicates({ dictionaryId, onClose, onMergeComplete }: Props) {
  const [groups, setGroups] = useState<MergeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState<string | null>(null);
  const [mergedCount, setMergedCount] = useState(0);

  useEffect(() => { fetchCandidates(); }, []);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/natural-dictionary/${dictionaryId}/merge-candidates?limit=200`);
      const data = await res.json();
      setGroups(data.groups || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleMerge = async (group: MergeGroup) => {
    setMerging(group.baseHeadword);
    try {
      const res = await fetch(`/api/natural-dictionary/${dictionaryId}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleIds: group.articles.map(a => a.id), headword: group.baseHeadword }),
      });
      if (res.ok) {
        setMergedCount(c => c + 1);
        setGroups(prev => prev.filter(g => g.baseHeadword !== group.baseHeadword));
        notifications.show({ message: `Merged "${group.baseHeadword}".`, color: 'green' });
      } else {
        const d = await res.json().catch(() => ({}));
        notifications.show({ message: d.error || 'Merge failed.', color: 'red' });
      }
    } catch { notifications.show({ message: 'Merge failed.', color: 'red' }); }
    finally { setMerging(null); }
  };

  const handleMergeAll = async () => {
    if (!confirm(`Merge all ${groups.length} groups?`)) return;
    let merged = 0;
    for (const group of [...groups]) {
      setMerging(group.baseHeadword);
      try {
        const res = await fetch(`/api/natural-dictionary/${dictionaryId}/merge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleIds: group.articles.map(a => a.id), headword: group.baseHeadword }),
        });
        if (res.ok) { merged++; setGroups(prev => prev.filter(g => g.baseHeadword !== group.baseHeadword)); }
      } catch { /* continue */ }
    }
    setMerging(null);
    setMergedCount(c => c + merged);
    notifications.show({ message: `Merged ${merged} groups.`, color: 'green' });
  };

  const handleClose = () => { if (mergedCount > 0) onMergeComplete(); onClose(); };

  return (
    <Modal opened onClose={handleClose} title="Merge Duplicate Headwords" size="lg">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Articles with similar headwords (e.g. "word [1]", "word [2]") can be merged into a single entry.
        </Text>

        {loading ? (
          <Text ta="center" c="dimmed" py="lg">Scanning for duplicates...</Text>
        ) : groups.length === 0 ? (
          <Text ta="center" c="dimmed" py="lg">
            {mergedCount > 0 ? `Done! Merged ${mergedCount} group${mergedCount !== 1 ? 's' : ''}.` : 'No duplicates found.'}
          </Text>
        ) : (
          <>
            <Group justify="space-between">
              <Badge variant="light" color="orange">{groups.length} groups</Badge>
              <Button size="compact-sm" color="orange" leftSection={<IconGitMerge size={14} />} onClick={handleMergeAll} disabled={!!merging}>
                Merge All
              </Button>
            </Group>

            <ScrollArea h={400}>
              <Stack gap="xs">
                {groups.map((g) => (
                  <Paper key={g.baseHeadword} p="sm" withBorder radius="sm">
                    <Group justify="space-between">
                      <div>
                        <Text fw={500}>{g.baseHeadword}</Text>
                        <Text size="xs" c="dimmed">{g.count} articles</Text>
                      </div>
                      <Button size="compact-xs" variant="light" color="orange" onClick={() => handleMerge(g)} loading={merging === g.baseHeadword} disabled={!!merging && merging !== g.baseHeadword}>
                        Merge
                      </Button>
                    </Group>
                    <Stack gap={2} mt="xs">
                      {g.articles.map((a) => (
                        <Group key={a.id} justify="space-between">
                          <Text size="xs" ff="monospace">{a.headword}</Text>
                          <Text size="xs" c="dimmed">{a.sensesCount}s / {a.meaningsCount}m</Text>
                        </Group>
                      ))}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </ScrollArea>
          </>
        )}
      </Stack>
    </Modal>
  );
}
