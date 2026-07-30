import { useState } from 'react';
import { Modal, TextInput, Button, Group, Stack, Paper, Text, Select, ActionIcon, Divider } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';

const LINK_TYPES = [
  { value: 'Synonym', label: 'Synonym' },
  { value: 'Antonym', label: 'Antonym' },
  { value: 'Root', label: 'Root' },
  { value: 'DerivedForm', label: 'Derived Form' },
  { value: 'Related', label: 'Related' },
  { value: 'SeeAlso', label: 'See Also' },
];

interface Props {
  article: any | null;
  dictionaryId: string;
  onSave: (saved: any) => void;
  onCancel: () => void;
}

export default function ArticleEditor({ article, dictionaryId, onSave, onCancel }: Props) {
  const isEdit = !!article?.id;

  const [headword, setHeadword] = useState(article?.headword || '');
  const [pronunciation, setPronunciation] = useState(article?.pronunciation || '');
  const [senses, setSenses] = useState<any[]>(() => {
    if (article?.senses?.length) return structuredClone(article.senses);
    return [{ partOfSpeech: '', grammar: '', meanings: [{ definition: '', examples: [], label: '' }] }];
  });
  const [links, setLinks] = useState<any[]>(() => article?.links?.length ? structuredClone(article.links) : []);
  const [saving, setSaving] = useState(false);

  const addSense = () => setSenses([...senses, { partOfSpeech: '', grammar: '', meanings: [{ definition: '', examples: [], label: '' }] }]);
  const removeSense = (i: number) => setSenses(senses.filter((_, idx) => idx !== i));
  const updateSense = (i: number, field: string, val: string) => {
    const u = [...senses]; u[i] = { ...u[i], [field]: val }; setSenses(u);
  };

  const addMeaning = (si: number) => {
    const u = [...senses]; u[si] = { ...u[si], meanings: [...u[si].meanings, { definition: '', examples: [], label: '' }] }; setSenses(u);
  };
  const removeMeaning = (si: number, mi: number) => {
    const u = [...senses]; u[si] = { ...u[si], meanings: u[si].meanings.filter((_: any, i: number) => i !== mi) }; setSenses(u);
  };
  const updateMeaning = (si: number, mi: number, field: string, val: any) => {
    const u = [...senses]; const m = [...u[si].meanings]; m[mi] = { ...m[mi], [field]: val }; u[si] = { ...u[si], meanings: m }; setSenses(u);
  };

  const addExample = (si: number, mi: number) => {
    const u = [...senses]; const m = [...u[si].meanings]; m[mi] = { ...m[mi], examples: [...(m[mi].examples || []), ''] }; u[si] = { ...u[si], meanings: m }; setSenses(u);
  };
  const updateExample = (si: number, mi: number, ei: number, val: string) => {
    const u = [...senses]; const m = [...u[si].meanings]; const ex = [...m[mi].examples]; ex[ei] = val; m[mi] = { ...m[mi], examples: ex }; u[si] = { ...u[si], meanings: m }; setSenses(u);
  };
  const removeExample = (si: number, mi: number, ei: number) => {
    const u = [...senses]; const m = [...u[si].meanings]; m[mi] = { ...m[mi], examples: m[mi].examples.filter((_: any, i: number) => i !== ei) }; u[si] = { ...u[si], meanings: m }; setSenses(u);
  };

  const addLink = () => setLinks([...links, { linkType: 'Synonym', targetWord: '', note: '' }]);
  const removeLink = (i: number) => setLinks(links.filter((_, idx) => idx !== i));
  const updateLink = (i: number, field: string, val: string) => { const u = [...links]; u[i] = { ...u[i], [field]: val }; setLinks(u); };

  const handleSave = async () => {
    if (!headword.trim()) return;
    const cleanSenses = senses.map(s => ({ ...s, meanings: s.meanings.filter((m: any) => m.definition.trim()).map((m: any) => ({ ...m, examples: (m.examples || []).filter((e: string) => e.trim()), label: m.label?.trim() || null })) })).filter(s => s.meanings.length > 0);
    const cleanLinks = links.filter(l => l.targetWord.trim());

    const body = { headword: headword.trim(), pronunciation: pronunciation.trim() || null, senses: cleanSenses, links: cleanLinks, rawDefinition: article?.rawDefinition || null, alternates: article?.alternates || null };
    setSaving(true);
    try {
      const url = isEdit ? `/api/natural-dictionary/articles/${article.id}` : `/api/natural-dictionary/${dictionaryId}/articles`;
      const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error || 'Save failed.'); return; }
      onSave(await res.json());
    } catch { alert('Save failed.'); }
    finally { setSaving(false); }
  };

  return (
    <Modal opened onClose={onCancel} title={isEdit ? 'Edit Word' : 'Add New Word'} size="xl" closeOnClickOutside={!saving}>
      <Stack gap="sm">
        <Group grow>
          <TextInput label="Headword *" value={headword} onChange={(e) => setHeadword(e.currentTarget.value)} placeholder="e.g. run" />
          <TextInput label="Pronunciation" value={pronunciation} onChange={(e) => setPronunciation(e.currentTarget.value)} placeholder="e.g. rʌn" />
        </Group>

        <Divider label="Senses" labelPosition="left" />

        {senses.map((sense, si) => (
          <Paper key={si} p="sm" withBorder radius="sm" bg="gray.0">
            <Group justify="space-between" mb="xs">
              <Group grow style={{ flex: 1 }}>
                <TextInput size="xs" placeholder="Part of speech" value={sense.partOfSpeech || ''} onChange={(e) => updateSense(si, 'partOfSpeech', e.currentTarget.value)} />
                <TextInput size="xs" placeholder="Grammar" value={sense.grammar || ''} onChange={(e) => updateSense(si, 'grammar', e.currentTarget.value)} />
              </Group>
              {senses.length > 1 && <ActionIcon size="sm" color="red" variant="subtle" onClick={() => removeSense(si)}><IconTrash size={12} /></ActionIcon>}
            </Group>

            {sense.meanings.map((m: any, mi: number) => (
              <Paper key={mi} p="xs" mb="xs" withBorder radius="xs">
                <Group justify="space-between" align="flex-start">
                  <Stack gap={4} style={{ flex: 1 }}>
                    <TextInput size="xs" placeholder="Definition *" value={m.definition} onChange={(e) => updateMeaning(si, mi, 'definition', e.currentTarget.value)} />
                    <TextInput size="xs" placeholder="Label (e.g. informal)" value={m.label || ''} onChange={(e) => updateMeaning(si, mi, 'label', e.currentTarget.value)} />
                    {(m.examples || []).map((ex: string, ei: number) => (
                      <Group key={ei} gap={4}>
                        <TextInput size="xs" placeholder="Example" value={ex} onChange={(e) => updateExample(si, mi, ei, e.currentTarget.value)} style={{ flex: 1 }} />
                        <ActionIcon size="xs" color="red" variant="subtle" onClick={() => removeExample(si, mi, ei)}><IconTrash size={10} /></ActionIcon>
                      </Group>
                    ))}
                    <Button size="compact-xs" variant="subtle" leftSection={<IconPlus size={10} />} onClick={() => addExample(si, mi)}>Example</Button>
                  </Stack>
                  {sense.meanings.length > 1 && <ActionIcon size="xs" color="red" variant="subtle" onClick={() => removeMeaning(si, mi)}><IconTrash size={10} /></ActionIcon>}
                </Group>
              </Paper>
            ))}
            <Button size="compact-xs" variant="light" leftSection={<IconPlus size={10} />} onClick={() => addMeaning(si)}>Meaning</Button>
          </Paper>
        ))}
        <Button size="compact-xs" variant="light" leftSection={<IconPlus size={12} />} onClick={addSense}>Add Sense</Button>

        <Divider label="Word Links" labelPosition="left" />

        {links.map((link, li) => (
          <Group key={li} gap="xs">
            <Select size="xs" data={LINK_TYPES} value={typeof link.linkType === 'number' ? LINK_TYPES[link.linkType]?.value : link.linkType} onChange={(v) => updateLink(li, 'linkType', v || 'Synonym')} style={{ width: 130 }} />
            <TextInput size="xs" placeholder="Target word" value={link.targetWord || ''} onChange={(e) => updateLink(li, 'targetWord', e.currentTarget.value)} style={{ flex: 1 }} />
            <TextInput size="xs" placeholder="Note" value={link.note || ''} onChange={(e) => updateLink(li, 'note', e.currentTarget.value)} style={{ width: 120 }} />
            <ActionIcon size="sm" color="red" variant="subtle" onClick={() => removeLink(li)}><IconTrash size={12} /></ActionIcon>
          </Group>
        ))}
        <Button size="compact-xs" variant="light" leftSection={<IconPlus size={12} />} onClick={addLink}>Add Link</Button>

        <Divider />
        <Group justify="flex-end">
          <Button variant="default" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>{isEdit ? 'Update' : 'Add Word'}</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
