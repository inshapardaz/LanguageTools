import { useState, useCallback } from 'react';
import { Paper, Group, Button, Textarea, SegmentedControl, Stack, Alert, Grid, Table, TextInput, Badge, Text, Divider, ActionIcon } from '@mantine/core';
import { IconArrowsExchange, IconAlertCircle, IconEdit, IconCheck, IconX, IconPlus } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useI18n, type TranslationKeys } from '../i18n';

const DIRECTIONS: { value: string; labelKey: TranslationKeys }[] = [
  { value: 'Roman|UrduArabic', labelKey: 'Roman → Urdu' },
  { value: 'Roman|HindiDevanagari', labelKey: 'Roman → Hindi' },
  { value: 'UrduArabic|Roman', labelKey: 'Urdu → Roman' },
  { value: 'UrduArabic|HindiDevanagari', labelKey: 'Urdu → Hindi' },
  { value: 'HindiDevanagari|Roman', labelKey: 'Hindi → Roman' },
  { value: 'HindiDevanagari|UrduArabic', labelKey: 'Hindi → Urdu' },
];

const SCRIPT_INFO: Record<string, { dir: 'ltr' | 'rtl'; placeholder: string; fontFamily: string }> = {
  Roman: { dir: 'ltr', placeholder: 'Type romanised text here...', fontFamily: 'inherit' },
  UrduArabic: { dir: 'rtl', placeholder: '...یہاں اردو ٹائپ کریں', fontFamily: "'Urdu UI', inherit" },
  HindiDevanagari: { dir: 'ltr', placeholder: 'यहाँ हिंदी टाइप करें...', fontFamily: "'Noto Sans Devanagari', sans-serif" },
};

interface WordDetail {
  input: string;
  output: string;
  source: 'dictionary' | 'rules' | 'punctuation';
  dictionaryEntryId?: string;
}

export default function Converter() {
  const { t } = useI18n();
  const [direction, setDirection] = useState(DIRECTIONS[0].value);
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [wordDetails, setWordDetails] = useState<WordDetail[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const [from, to] = direction.split('|');

  const convert = useCallback(async () => {
    if (!inputText.trim()) { setOutputText(''); setWordDetails([]); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, from, to, details: true }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Conversion failed.'); setOutputText(''); setWordDetails([]); }
      else {
        setOutputText(data.result);
        setWordDetails(data.words || []);
      }
    } catch {
      setError(t('converterError'));
      setOutputText('');
      setWordDetails([]);
    } finally {
      setLoading(false);
    }
  }, [inputText, from, to, t]);

  const swap = () => {
    const swapped = `${to}|${from}`;
    if (DIRECTIONS.find(d => d.value === swapped)) {
      setDirection(swapped);
      setInputText(outputText);
      setOutputText('');
      setWordDetails([]);
    }
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(wordDetails[index].output);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditValue('');
  };

  const saveCorrection = async (index: number, forceNew = false) => {
    const word = wordDetails[index];
    const correctedOutput = editValue.trim();
    if (!correctedOutput || correctedOutput === word.output) { cancelEdit(); return; }

    // Build dictionary entry payload based on direction
    const entry: Record<string, string | undefined> = {};

    if (from === 'Roman') {
      entry.roman = word.input.toLowerCase();
      if (to === 'UrduArabic') entry.urdu = correctedOutput;
      else if (to === 'HindiDevanagari') entry.hindi = correctedOutput;
    } else if (to === 'Roman') {
      entry.roman = correctedOutput.toLowerCase();
      if (from === 'UrduArabic') entry.urdu = word.input;
      else if (from === 'HindiDevanagari') entry.hindi = word.input;
    } else {
      entry.roman = word.input.toLowerCase();
      if (to === 'UrduArabic') entry.urdu = correctedOutput;
      else if (to === 'HindiDevanagari') entry.hindi = correctedOutput;
    }

    try {
      let res: Response;
      if (word.dictionaryEntryId && !forceNew) {
        // Fetch existing entry first to preserve other fields
        const existing = await fetch(`/api/dictionary/${word.dictionaryEntryId}`).then(r => r.ok ? r.json() : null);
        if (existing) {
          // Merge: keep existing fields, override only the target script
          const merged = {
            roman: entry.roman || existing.roman,
            urdu: entry.urdu ?? existing.urdu ?? undefined,
            hindi: entry.hindi ?? existing.hindi ?? undefined,
            meaning: existing.meaning ?? undefined,
            category: existing.category ?? undefined,
          };
          res = await fetch(`/api/dictionary/${word.dictionaryEntryId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(merged),
          });
        } else {
          // Entry no longer exists, create new
          res = await fetch('/api/dictionary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry),
          });
        }
      } else {
        // Create new entry
        res = await fetch('/api/dictionary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        });
      }

      if (res.ok) {
        const saved = await res.json();
        // Update local state
        const updated = [...wordDetails];
        updated[index] = { ...updated[index], output: correctedOutput, source: 'dictionary', dictionaryEntryId: saved.id };
        setWordDetails(updated);

        // Rebuild output text from corrected words
        const newOutput = updated.map(w => w.output).join(' ');
        setOutputText(newOutput);

        notifications.show({ message: t('correctionSaved'), color: 'green' });
      }
    } catch { /* ignore */ }

    setEditingIndex(null);
    setEditValue('');
  };

  const segmentData = DIRECTIONS.map(d => ({ value: d.value, label: t(d.labelKey) }));

  return (
    <Paper shadow="xs" p="lg" radius="md" withBorder>
      <Stack gap="md">
        <SegmentedControl
          value={direction}
          onChange={(v) => { setDirection(v); setOutputText(''); setWordDetails([]); }}
          data={segmentData}
          size="sm"
          fullWidth
        />

        <Grid>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Textarea
              label={`${from} (${t('converterInput')})`}
              dir={SCRIPT_INFO[from]?.dir}
              placeholder={SCRIPT_INFO[from]?.placeholder}
              value={inputText}
              onChange={(e) => setInputText(e.currentTarget.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) convert(); }}
              minRows={6}
              autosize
              styles={{ input: { fontFamily: SCRIPT_INFO[from]?.fontFamily, fontSize: '1.1rem', lineHeight: 1.8 } }}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Textarea
              label={`${to} (${t('converterOutput')})`}
              dir={SCRIPT_INFO[to]?.dir}
              value={outputText}
              readOnly
              placeholder={t('converterPlaceholderOutput')}
              minRows={6}
              autosize
              styles={{ input: { fontFamily: SCRIPT_INFO[to]?.fontFamily, fontSize: '1.1rem', lineHeight: 1.8, backgroundColor: 'var(--mantine-color-default)' } }}
            />
          </Grid.Col>
        </Grid>

        <Group justify="center">
          <Button variant="subtle" size="xs" leftSection={<IconArrowsExchange size={14} />} onClick={swap}>
            {t('converterSwap')}
          </Button>
        </Group>

        <Button fullWidth onClick={convert} loading={loading} disabled={!inputText.trim()}>
          {t('converterConvert')}
        </Button>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
            {error}
          </Alert>
        )}

        {/* Word-by-word details and correction */}
        {wordDetails.length > 0 && (
          <>
            <Divider label={t('correctionTitle')} labelPosition="left" />
            <Table striped highlightOnHover withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('correctionSource')}</Table.Th>
                  <Table.Th>{t('correctionOutput')}</Table.Th>
                  <Table.Th w={100}>{t('correctionOrigin')}</Table.Th>
                  <Table.Th w={80}>{t('dictActions')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {wordDetails.filter(w => w.source !== 'punctuation').map((word, i) => {
                  // Find the original index in wordDetails for editing
                  const realIndex = wordDetails.indexOf(word);
                  return (
                  <Table.Tr key={realIndex}>
                    <Table.Td>
                      <Text size="sm" dir={SCRIPT_INFO[from]?.dir} style={{ fontFamily: SCRIPT_INFO[from]?.fontFamily }}>
                        {word.input}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {editingIndex === realIndex ? (
                        <TextInput
                          size="xs"
                          value={editValue}
                          onChange={(e) => setEditValue(e.currentTarget.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveCorrection(realIndex);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          dir={SCRIPT_INFO[to]?.dir}
                          style={{ fontFamily: SCRIPT_INFO[to]?.fontFamily }}
                          placeholder={t('correctionPlaceholder')}
                          autoFocus
                        />
                      ) : (
                        <Text size="sm" dir={SCRIPT_INFO[to]?.dir} style={{ fontFamily: SCRIPT_INFO[to]?.fontFamily }}>
                          {word.output}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        size="xs"
                        variant="light"
                        color={word.source === 'dictionary' ? 'green' : 'gray'}
                      >
                        {word.source === 'dictionary' ? t('correctionFromDict') : t('correctionFromRules')}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {editingIndex === realIndex ? (
                        <Group gap={4} wrap="nowrap">
                          <Button size="compact-xs" color="green" variant="light" leftSection={<IconCheck size={12} />} onClick={() => saveCorrection(realIndex)}>
                            {word.dictionaryEntryId ? t('editorUpdate') : t('correctionSave')}
                          </Button>
                          {word.dictionaryEntryId && (
                            <Button size="compact-xs" color="blue" variant="light" leftSection={<IconPlus size={12} />} onClick={() => saveCorrection(realIndex, true)}>
                              {t('correctionCreateNew')}
                            </Button>
                          )}
                          <ActionIcon size="sm" color="red" variant="subtle" onClick={cancelEdit}>
                            <IconX size={14} />
                          </ActionIcon>
                        </Group>
                      ) : (
                        <Button size="compact-xs" variant="light" leftSection={<IconEdit size={12} />} onClick={() => startEdit(realIndex)}>
                          {t('correctionEdit')}
                        </Button>
                      )}
                    </Table.Td>
                  </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </>
        )}
      </Stack>
    </Paper>
  );
}
