import { useState, useEffect, useCallback } from 'react';
import DictionaryBrowser from './DictionaryBrowser';
import ArticleView from './ArticleView';

export default function NaturalDictionary() {
  const [dictionaries, setDictionaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lookupWord, setLookupWord] = useState('');
  const [lookupResults, setLookupResults] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [browsing, setBrowsing] = useState(null); // { id, name } when browsing a dictionary

  const fetchDictionaries = useCallback(async () => {
    try {
      const res = await fetch('/api/natural-dictionary');
      const data = await res.json();
      setDictionaries(data.dictionaries || []);
    } catch {
      setError('Failed to load dictionaries.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDictionaries(); }, [fetchDictionaries]);

  const handleUpload = async (file) => {
    if (!file) return;

    setUploading(true);
    setUploadProgress('Uploading and parsing dictionary...');
    setError('');
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/natural-dictionary/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Upload failed.');
        return;
      }

      setMessage(`Imported "${data.dictionary.name}" with ${data.dictionary.entryCount.toLocaleString()} entries.`);
      setShowUpload(false);
      fetchDictionaries();
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete dictionary "${name}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/natural-dictionary/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage(`Deleted "${name}".`);
        fetchDictionaries();
      } else {
        setError('Failed to delete dictionary.');
      }
    } catch {
      setError('Failed to delete dictionary.');
    }
  };

  const handleLookup = async (e) => {
    e?.preventDefault();
    if (!lookupWord.trim()) return;

    try {
      const res = await fetch(`/api/natural-dictionary/lookup?word=${encodeURIComponent(lookupWord.trim())}`);
      const data = await res.json();
      setLookupResults(data);
    } catch {
      setError('Lookup failed.');
    }
  };

  const handleSuggest = async (prefix) => {
    setLookupWord(prefix);
    if (prefix.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const res = await fetch(`/api/natural-dictionary/suggest?prefix=${encodeURIComponent(prefix.trim())}&limit=8`);
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch {
      setSuggestions([]);
    }
  };

  const selectSuggestion = (word) => {
    setLookupWord(word);
    setSuggestions([]);
    // Auto-lookup
    fetch(`/api/natural-dictionary/lookup?word=${encodeURIComponent(word)}`)
      .then(r => r.json())
      .then(setLookupResults)
      .catch(() => {});
  };

  if (loading) return <div className="loading">Loading dictionaries...</div>;

  // Show dictionary browser if a dictionary is selected
  if (browsing) {
    return (
      <DictionaryBrowser
        dictionaryId={browsing.id}
        dictionaryName={browsing.name}
        onBack={() => setBrowsing(null)}
      />
    );
  }

  return (
    <div className="dictionary-page">
      {/* Stats bar */}
      <div className="stats-bar">
        <span><strong>{dictionaries.length}</strong> dictionaries loaded</span>
        <span><strong>{dictionaries.reduce((sum, d) => sum + d.entryCount, 0).toLocaleString()}</strong> total entries</span>
      </div>

      {/* Messages */}
      {message && <div className="message" onClick={() => setMessage('')}>{message}</div>}
      {error && <div className="error" style={{ marginBottom: '1rem', padding: '0.5rem 1rem', background: '#fff5f5', borderRadius: '6px' }}>{error}</div>}

      {/* Toolbar */}
      <div className="dict-toolbar">
        <form className="search-form" onSubmit={handleLookup}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              value={lookupWord}
              onChange={(e) => handleSuggest(e.target.value)}
              onBlur={() => setTimeout(() => setSuggestions([]), 150)}
              placeholder="Look up a word..."
              aria-label="Look up a word"
            />
            {suggestions.length > 0 && (
              <ul className="suggestions-dropdown" role="listbox" aria-label="Suggestions">
                {suggestions.map((s, i) => (
                  <li key={i} role="option" onMouseDown={() => selectSuggestion(s)}>{s}</li>
                ))}
              </ul>
            )}
          </div>
          <button type="submit">Lookup</button>
        </form>
        <button className="add-btn" onClick={() => setShowUpload(true)}>
          + Upload Dictionary
        </button>
      </div>

      {/* Lookup results */}
      {lookupResults && (
        <div className="lookup-results">
          <h4>Results for "{lookupResults.headword}"</h4>
          {lookupResults.entries.length === 0 && <p className="no-results">No entries found.</p>}
          {lookupResults.entries.map((entry, i) => (
            <div key={i} className="lookup-entry">
              <div className="lookup-dict-name">{entry.dictionaryName}</div>
              <ArticleView article={entry} />
            </div>
          ))}
          <button className="close-results" onClick={() => setLookupResults(null)}>Close</button>
        </div>
      )}

      {/* Dictionary list */}
      <div className="dict-table-wrap">
        <table className="dict-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Format</th>
              <th>Entries</th>
              <th>Languages</th>
              <th>Imported</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {dictionaries.length === 0 && (
              <tr><td colSpan="6" className="empty-row">No dictionaries uploaded yet. Click "Upload Dictionary" to get started.</td></tr>
            )}
            {dictionaries.map(d => (
              <tr key={d.id}>
                <td><strong>{d.name}</strong>{d.originalFileName && <><br /><small style={{ color: '#999' }}>{d.originalFileName}</small></>}</td>
                <td><span className="category-badge">{d.format}</span></td>
                <td>{d.entryCount.toLocaleString()}</td>
                <td>{[d.sourceLanguage, d.targetLanguage].filter(Boolean).join(' → ') || '—'}</td>
                <td>{new Date(d.importedAt).toLocaleDateString()}</td>
                <td className="actions-cell">
                  <button className="edit-btn" onClick={() => setBrowsing({ id: d.id, name: d.name })}>Browse</button>
                  <button className="delete-btn" onClick={() => handleDelete(d.id, d.name)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div className="form-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowUpload(false); }}>
          <div className="form-modal" style={{ maxWidth: '520px' }}>
            <h3>Upload Dictionary</h3>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
              Upload a GoldenDict-compatible dictionary file. Supported formats:
            </p>
            <ul className="format-list">
              <li><strong>StarDict</strong> — .zip containing .ifo, .idx, .dict/.dict.dz</li>
              <li><strong>DSL</strong> — .zip containing .dsl or .dsl.dz (ABBYY Lingvo)</li>
            </ul>

            <div
              className={`upload-dropzone ${dragOver ? 'drag-over' : ''} ${uploading ? 'uploading' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              role="button"
              tabIndex={0}
              aria-label="Drop a dictionary file here or click to browse"
            >
              {uploading ? (
                <div className="upload-status">
                  <div className="spinner" aria-hidden="true"></div>
                  <span>{uploadProgress}</span>
                </div>
              ) : (
                <>
                  <div className="dropzone-icon" aria-hidden="true">📚</div>
                  <p>Drag & drop a dictionary archive here</p>
                  <p className="dropzone-sub">or click to browse</p>
                  <input
                    type="file"
                    accept=".zip,.tar.gz,.tgz,.ifo,.dsl,.dsl.dz"
                    onChange={handleFileSelect}
                    className="file-input"
                    aria-label="Select dictionary file"
                  />
                </>
              )}
            </div>

            <div className="form-actions">
              <button className="cancel-btn" onClick={() => setShowUpload(false)} disabled={uploading}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
