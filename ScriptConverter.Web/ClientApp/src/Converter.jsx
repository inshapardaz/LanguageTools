import { useState, useCallback } from 'react';

const SCRIPTS = {
  Roman: { label: 'Roman', dir: 'ltr', placeholder: 'Type romanised text here...' },
  UrduArabic: { label: 'Urdu (Arabic)', dir: 'rtl', placeholder: '...یہاں اردو ٹائپ کریں' },
  HindiDevanagari: { label: 'Hindi (Devanagari)', dir: 'ltr', placeholder: 'यहाँ हिंदी टाइप करें...' },
};

const DIRECTIONS = [
  { from: 'Roman', to: 'UrduArabic', label: 'Roman → Urdu' },
  { from: 'Roman', to: 'HindiDevanagari', label: 'Roman → Hindi' },
  { from: 'UrduArabic', to: 'Roman', label: 'Urdu → Roman' },
  { from: 'UrduArabic', to: 'HindiDevanagari', label: 'Urdu → Hindi' },
  { from: 'HindiDevanagari', to: 'Roman', label: 'Hindi → Roman' },
  { from: 'HindiDevanagari', to: 'UrduArabic', label: 'Hindi → Urdu' },
];

export default function Converter() {
  const [direction, setDirection] = useState(DIRECTIONS[0]);
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const convert = useCallback(async () => {
    if (!inputText.trim()) {
      setOutputText('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, from: direction.from, to: direction.to }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Conversion failed.');
        setOutputText('');
      } else {
        setOutputText(data.result);
      }
    } catch {
      setError('Failed to connect to the server.');
      setOutputText('');
    } finally {
      setLoading(false);
    }
  }, [inputText, direction]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) convert();
  };

  const swapDirection = () => {
    const swapped = DIRECTIONS.find(d => d.from === direction.to && d.to === direction.from);
    if (swapped) {
      setDirection(swapped);
      setInputText(outputText);
      setOutputText('');
    }
  };

  const fromScript = SCRIPTS[direction.from];
  const toScript = SCRIPTS[direction.to];

  return (
    <div className="converter-card">
      <div className="direction-selector">
        {DIRECTIONS.map((d) => (
          <button
            key={`${d.from}-${d.to}`}
            className={`direction-btn ${direction === d ? 'active' : ''}`}
            onClick={() => { setDirection(d); setOutputText(''); }}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="text-areas">
        <div className="text-group">
          <label>{fromScript.label} (input)</label>
          <textarea
            dir={fromScript.dir}
            placeholder={fromScript.placeholder}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="text-group">
          <label>{toScript.label} (output)</label>
          <textarea
            dir={toScript.dir}
            value={outputText}
            readOnly
            placeholder="Converted text will appear here..."
          />
        </div>
      </div>

      <button className="swap-btn" onClick={swapDirection}>⇄ Swap</button>

      <button className="convert-btn" onClick={convert} disabled={loading || !inputText.trim()}>
        {loading ? 'Converting...' : 'Convert (Ctrl+Enter)'}
      </button>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
