import { useState, useCallback } from 'react';
import { Paper, Group, Button, Textarea, SegmentedControl, Stack, Alert, Grid } from '@mantine/core';
import { IconArrowsExchange, IconAlertCircle } from '@tabler/icons-react';

const DIRECTIONS = [
  { value: 'Roman|UrduArabic', label: 'Roman → Urdu' },
  { value: 'Roman|HindiDevanagari', label: 'Roman → Hindi' },
  { value: 'UrduArabic|Roman', label: 'Urdu → Roman' },
  { value: 'UrduArabic|HindiDevanagari', label: 'Urdu → Hindi' },
  { value: 'HindiDevanagari|Roman', label: 'Hindi → Roman' },
  { value: 'HindiDevanagari|UrduArabic', label: 'Hindi → Urdu' },
];

const SCRIPT_INFO: Record<string, { dir: 'ltr' | 'rtl'; placeholder: string }> = {
  Roman: { dir: 'ltr', placeholder: 'Type romanised text here...' },
  UrduArabic: { dir: 'rtl', placeholder: '...یہاں اردو ٹائپ کریں' },
  HindiDevanagari: { dir: 'ltr', placeholder: 'यहाँ हिंदी टाइप करें...' },
};

export default function Converter() {
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
      setError('Failed to connect to the server.');
      setOutputText('');
    } finally {
      setLoading(false);
    }
  }, [inputText, from, to]);

  const swap = () => {
    const swapped = `${to}|${from}`;
    const exists = DIRECTIONS.find(d => d.value === swapped);
    if (exists) {
      setDirection(swapped);
      setInputText(outputText);
      setOutputText('');
    }
  };

  return (
    <Paper shadow="xs" p="lg" radius="md" withBorder>
      <Stack gap="md">
        <SegmentedControl
          value={direction}
          onChange={(v) => { setDirection(v); setOutputText(''); }}
          data={DIRECTIONS}
          size="sm"
          fullWidth
        />

        <Grid>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Textarea
              label={`${from} (input)`}
              dir={SCRIPT_INFO[from]?.dir}
              placeholder={SCRIPT_INFO[from]?.placeholder}
              value={inputText}
              onChange={(e) => setInputText(e.currentTarget.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) convert(); }}
              minRows={6}
              autosize
              styles={{ input: { fontFamily: "'Noto Nastaliq Urdu', 'Noto Sans Devanagari', sans-serif", fontSize: '1.1rem' } }}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Textarea
              label={`${to} (output)`}
              dir={SCRIPT_INFO[to]?.dir}
              value={outputText}
              readOnly
              placeholder="Converted text will appear here..."
              minRows={6}
              autosize
              styles={{ input: { fontFamily: "'Noto Nastaliq Urdu', 'Noto Sans Devanagari', sans-serif", fontSize: '1.1rem', backgroundColor: 'var(--mantine-color-gray-0)' } }}
            />
          </Grid.Col>
        </Grid>

        <Group justify="center">
          <Button variant="subtle" size="xs" leftSection={<IconArrowsExchange size={14} />} onClick={swap}>
            Swap
          </Button>
        </Group>

        <Button fullWidth onClick={convert} loading={loading} disabled={!inputText.trim()}>
          Convert (Ctrl+Enter)
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
