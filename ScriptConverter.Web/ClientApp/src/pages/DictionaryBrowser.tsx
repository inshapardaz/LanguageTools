import { useState, useEffect, useCallback } from 'react';
import { Paper, Group, Button, TextInput, Stack, Text, Accordion, Pagination, Menu, Modal, Alert } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconSearch, IconPlus, IconArrowLeft, IconDownload, IconGitMerge, IconEdit, IconTrash } from '@tabler/icons-react';
import ArticleView from '../components/ArticleView';
import ArticleEditor from '../components/ArticleEditor';
import MergeDuplicates from '../components/MergeDuplicates';

interface Props {
  dictionaryId: string;
  dictionaryName: string;
  urlParams: Record<string, string>;
  onUpdateParams: (params: Record<string, string>) => void;
  onBack: () => void;
}

export default function DictionaryBrowser({ dictionaryId, dictionaryName, urlParams, onUpdateParams, onBack }: Props) {
  const initialPage = parseInt(urlParams?.page) || 1;
  const initialQuery = urlParams?.q || '';
  const initialWord = urlParams?.word || null;

  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeSearch, setActiveSearch] = useState(initialQuery);
  const [page, setPage] = useState(initialPage);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(initialWord);
  const [editing, setEditing] = useState<any>(null);
  const [showMerge, setShowMerge] = useState(false);
  const pageSize = 50;

  const syncUrl = useCallback((p: number, q: string, word: string | null) => {
    const params: Record<string, string> = {};
    if (p > 1) params.page = String(p);
    if (q) params.q = q;
    if (word) params.word = word;
    onUpdateParams(params);
  }, [onUpdateParams]);

  const fetchArticles = useCallback(async (p: number, query: string) => {
    setLoading(true);
    try {
      const endpoint = query
        ? `/api/natural-dictionary/${dictionaryId}/search?q=${encodeURIComponent(query)}&page=${p}&pageSize=${pageSize}`
        : `/api/natural-dictionary/${dictionaryId}/browse?page=${p}&pageSize=${pageSize}`;
      const res = await fetch(endpoint);
      const data = await res.json();
      setArticles(data.articles || []);
      setTotalCount(data.totalCount || 0);
      setTotalPages(data.totalPages || 0);
      setPage(data.page || 1);
    } catch { setArticles([]); }
    finally { setLoading(false); }
  }, [dictionaryId]);

  useEffect(() => { fetchArticles(initialPage, initialQuery); }, [fetchArticles]); // eslint-disable-line

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    setActiveSearch(q);
    setExpanded(null);
    fetchArticles(1, q);
    syncUrl(1, q, null);
  };

  const handleClear = () => {
    setSearchQuery('');
    setActiveSearch('');
    setExpanded(null);
    fetchArticles(1, '');
    syncUrl(1, '', null);
  };

  const goToPage = (p: number) => {
    setExpanded(null);
    fetchArticles(p, activeSearch);
    syncUrl(p, activeSearch, null);
  };

  const handleExpand = (val: string | null) => {
    setExpanded(val);
    syncUrl(page, activeSearch, val);
  };

  const handleDelete = async (id: number, headword: string) => {
    if (!confirm(`Delete "${headword}"?`)) return;
    const res = await fetch(`/api/natural-dictionary/articles/${id}`, { method: 'DELETE' });
    if (res.ok) {
      notifications.show({ message: `Deleted "${headword}".`, color: 'green' });
      fetchArticles(page, activeSearch);
    }
  };

  const handleSaveComplete = () => {
    setEditing(null);
    notifications.show({ message: 'Saved.', color: 'green' });
    fetchArticles(page, activeSearch);
  };

  return (
    <Paper shadow="xs" p="lg" radius="md" withBorder>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" wrap="wrap">
          <Group>
            <Button variant="subtle" size="compact-sm" leftSection={<IconArrowLeft size={14} />} onClick={onBack}>
              Back
            </Button>
            <div>
              <Text fw={600} size="lg">{dictionaryName}</Text>
              <Text size="xs" c="dimmed">{totalCount.toLocaleString()} entries</Text>
            </div>
          </Group>
          <Group gap="xs">
            <Button size="compact-sm" leftSection={<IconPlus size={14} />} onClick={() => setEditing('new')}>
              Add Word
            </Button>
            <Button size="compact-sm" variant="light" color="orange" leftSection={<IconGitMerge size={14} />} onClick={() => setShowMerge(true)}>
              Merge
            </Button>
            <Menu shadow="md" width={160}>
              <Menu.Target>
                <Button size="compact-sm" variant="light" leftSection={<IconDownload size={14} />}>Export</Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item component="a" href={`/api/natural-dictionary/${dictionaryId}/export?format=stardict`} download>StarDict</Menu.Item>
                <Menu.Item component="a" href={`/api/natural-dictionary/${dictionaryId}/export?format=dsl`} download>DSL (Lingvo)</Menu.Item>
                <Menu.Item component="a" href={`/api/natural-dictionary/${dictionaryId}/export?format=kobo`} download>Kobo Reader</Menu.Item>
                <Menu.Item component="a" href={`/api/natural-dictionary/${dictionaryId}/export?format=kindle`} download>Kindle (OPF)</Menu.Item>
                <Menu.Item component="a" href={`/api/natural-dictionary/${dictionaryId}/export?format=json`} download>JSON</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>

        {/* Search */}
        <form onSubmit={handleSearch}>
          <Group>
            <TextInput
              placeholder="Search headwords..."
              leftSection={<IconSearch size={14} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <Button type="submit">Search</Button>
            {activeSearch && <Button variant="subtle" color="red" onClick={handleClear}>Clear</Button>}
          </Group>
        </form>

        {activeSearch && (
          <Text size="sm" c="dimmed">
            Results for "<strong>{activeSearch}</strong>" — {totalCount} match{totalCount !== 1 ? 'es' : ''}
          </Text>
        )}

        {/* Articles */}
        {loading ? (
          <Text ta="center" c="dimmed" py="xl">Loading...</Text>
        ) : articles.length === 0 ? (
          <Text ta="center" c="dimmed" py="xl">{activeSearch ? 'No entries match.' : 'No entries.'}</Text>
        ) : (
          <Accordion value={expanded} onChange={handleExpand} variant="separated">
            {articles.map((a) => (
              <Accordion.Item key={a.id} value={String(a.id)}>
                <Accordion.Control>
                  <Text fw={500}>{a.headword}</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <ArticleView article={a} />
                  <Group mt="sm" gap="xs">
                    <Button size="compact-xs" variant="light" leftSection={<IconEdit size={12} />} onClick={() => setEditing(a)}>Edit</Button>
                    <Button size="compact-xs" variant="light" color="red" leftSection={<IconTrash size={12} />} onClick={() => handleDelete(a.id, a.headword)}>Delete</Button>
                  </Group>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Group justify="center">
            <Pagination value={page} total={totalPages} onChange={goToPage} size="sm" />
          </Group>
        )}
      </Stack>

      {/* Editor */}
      {editing && (
        <ArticleEditor
          article={editing === 'new' ? null : editing}
          dictionaryId={dictionaryId}
          onSave={handleSaveComplete}
          onCancel={() => setEditing(null)}
        />
      )}

      {/* Merge */}
      {showMerge && (
        <MergeDuplicates
          dictionaryId={dictionaryId}
          onClose={() => setShowMerge(false)}
          onMergeComplete={() => fetchArticles(page, activeSearch)}
        />
      )}
    </Paper>
  );
}
