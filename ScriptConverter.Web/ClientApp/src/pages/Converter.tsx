import { useState, useCallback } from 'react';
import { Paper, Group, Button, Textarea, SegmentedControl, Stack, Alert, Grid } from '@mantine/core';
import { IconArrowsExchange, IconAlertCircle } from '@tabler/icons-react';
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

export default function Converter() {
  const { t } = useI18n();
  const [direction, setDirection] = useState(DIRECTIONS[0].value);
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [from, to] = direction.split('|');

  const convert = useCallback(async () => {
    if (!inputText.trim()) { setOutputText(''); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, from, to }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Conversion failed.'); setOutputText(''); }
      else { setOutputText(data.result); }
    } catch {
      setError(t('converterError'));
      setOutputText('');
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
    }
  };

  const segmentData = DIRECTIONS.map(d => ({ value: d.value, label: t(d.labelKey) }));

  return (
    <Paper shadow="xs" p="lg" radius="md" withBorder>
      <Stack gap="md">
        <SegmentedControl
          value={direction}
          onChange={(v) => { setDirection(v); setOutputText(''); }}
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
      </Stack>
    </Paper>
  );
}
