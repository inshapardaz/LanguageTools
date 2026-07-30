import { useState } from 'react';

const LINK_TYPES = ['Synonym', 'Antonym', 'Root', 'DerivedForm', 'Related', 'Narrower', 'Broader', 'SeeAlso'];
const LINK_TYPE_LABELS = {
  Synonym: 'Synonym',
  Antonym: 'Antonym',
  Root: 'Root',
  DerivedForm: 'Derived Form',
  Related: 'Related',
  Narrower: 'Narrower',
  Broader: 'Broader',
  SeeAlso: 'See Also',
};

/**
 * Modal form for adding or editing a dictionary article.
 * Supports structured fields: headword, pronunciation, senses (with POS, meanings, examples), and word links.
 */
export default function ArticleEditor({ article, dictionaryId, onSave, onCancel }) {
  const isEdit = !!article?.id;

  const [headword, setHeadword] = useState(article?.headword || '');
  const [pronunciation, setPronunciation] = useState(article?.pronunciation || '');
  const [senses, setSenses] = useState(() => {
    if (article?.senses?.length) return structuredClone(article.senses);
    return [{ partOfSpeech: '', grammar: '', meanings: [{ definition: '', examples: [], label: '' }] }];
  });
  const [links, setLinks] = useState(() => {
    if (article?.links?.length) return structuredClone(article.links);
    return [];
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // --- Senses management ---
  const addSense = () => {
    setSenses([...senses, { partOfSpeech: '', grammar: '', meanings: [{ definition: '', examples: [], label: '' }] }]);
  };

  const removeSense = (si) => {
    setSenses(senses.filter((_, i) => i !== si));
  };

  const updateSense = (si, field, value) => {
    const updated = [...senses];
    updated[si] = { ...updated[si], [field]: value };
    setSenses(updated);
  };

  // --- Meanings management ---
  const addMeaning = (si) => {
    const updated = [...senses];
    updated[si] = { ...updated[si], meanings: [...updated[si].meanings, { definition: '', examples: [], label: '' }] };
    setSenses(updated);
  };

  const removeMeaning = (si, mi) => {
    const updated = [...senses];
    updated[si] = { ...updated[si], meanings: updated[si].meanings.filter((_, i) => i !== mi) };
    setSenses(updated);
  };

  const updateMeaning = (si, mi, field, value) => {
    const updated = [...senses];
    const meanings = [...updated[si].meanings];
    meanings[mi] = { ...meanings[mi], [field]: value };
    updated[si] = { ...updated[si], meanings };
    setSenses(updated);
  };

  // --- Examples management ---
  const addExample = (si, mi) => {
    const updated = [...senses];
    const meanings = [...updated[si].meanings];
    meanings[mi] = { ...meanings[mi], examples: [...(meanings[mi].examples || []), ''] };
    updated[si] = { ...updated[si], meanings };
    setSenses(updated);
  };

  const removeExample = (si, mi, ei) => {
    const updated = [...senses];
    const meanings = [...updated[si].meanings];
    meanings[mi] = { ...meanings[mi], examples: meanings[mi].examples.filter((_, i) => i !== ei) };
    updated[si] = { ...updated[si], meanings };
    setSenses(updated);
  };

  const updateExample = (si, mi, ei, value) => {
    const updated = [...senses];
    const meanings = [...updated[si].meanings];
    const examples = [...meanings[mi].examples];
    examples[ei] = value;
    meanings[mi] = { ...meanings[mi], examples };
    updated[si] = { ...updated[si], meanings };
    setSenses(updated);
  };

  // --- Links management ---
  const addLink = () => {
    setLinks([...links, { linkType: 'Synonym', targetWord: '', note: '' }]);
  };

  const removeLink = (li) => {
    setLinks(links.filter((_, i) => i !== li));
  };

  const updateLink = (li, field, value) => {
    const updated = [...links];
    updated[li] = { ...updated[li], [field]: value };
    setLinks(updated);
  };

  // --- Save ---
  const handleSave = async () => {
    if (!headword.trim()) {
      setError('Headword is required.');
      return;
    }

    // Clean up empty senses/meanings
    const cleanSenses = senses
      .map(s => ({
        ...s,
        meanings: s.meanings
          .filter(m => m.definition.trim())
          .map(m => ({
            ...m,
            examples: (m.examples || []).filter(e => e.trim()),
            label: m.label?.trim() || null,
          })),
      }))
      .filter(s => s.meanings.length > 0);

    const cleanLinks = links.filter(l => l.targetWord.trim());

    const body = {
      headword: headword.trim(),
      pronunciation: pronunciation.trim() || null,
      senses: cleanSenses,
      links: cleanLinks,
      rawDefinition: article?.rawDefinition || null,
      alternates: article?.alternates || null,
    };

    setSaving(true);
    setError('');

    try {
      const url = isEdit
        ? `/api/natural-dictionary/articles/${article.id}`
        : `/api/natural-dictionary/${dictionaryId}/articles`;

      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to save.');
        return;
      }

      const saved = await res.json();
      onSave(saved);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="form-overlay" onClick={(e) => { if (e.target === e.currentTarget && !saving) onCancel(); }}>
      <div className="editor-modal">
        <h3>{isEdit ? 'Edit Word' : 'Add New Word'}</h3>

        {error && <div className="editor-error">{error}</div>}

        {/* Headword & Pronunciation */}
        <div className="editor-row-group">
          <div className="editor-field" style={{ flex: 2 }}>
            <label>Headword *</label>
            <input
              type="text"
              value={headword}
              onChange={(e) => setHeadword(e.target.value)}
              placeholder="e.g. run"
              autoFocus
            />
          </div>
          <div className="editor-field" style={{ flex: 1 }}>
            <label>Pronunciation</label>
            <input
              type="text"
              value={pronunciation}
              onChange={(e) => setPronunciation(e.target.value)}
              placeholder="e.g. rʌn"
            />
          </div>
        </div>

        {/* Senses */}
        <div className="editor-section">
          <div className="editor-section-header">
            <h4>Senses</h4>
            <button type="button" className="editor-add-btn" onClick={addSense}>+ Add Sense</button>
          </div>

          {senses.map((sense, si) => (
            <div key={si} className="editor-sense">
              <div className="editor-sense-header">
                <div className="editor-row-group">
                  <div className="editor-field" style={{ flex: 1 }}>
                    <label>Part of Speech</label>
                    <input
                      type="text"
                      value={sense.partOfSpeech || ''}
                      onChange={(e) => updateSense(si, 'partOfSpeech', e.target.value)}
                      placeholder="e.g. noun, verb"
                    />
                  </div>
                  <div className="editor-field" style={{ flex: 1 }}>
                    <label>Grammar</label>
                    <input
                      type="text"
                      value={sense.grammar || ''}
                      onChange={(e) => updateSense(si, 'grammar', e.target.value)}
                      placeholder="e.g. transitive, masculine"
                    />
                  </div>
                </div>
                {senses.length > 1 && (
                  <button type="button" className="editor-remove-btn" onClick={() => removeSense(si)} aria-label="Remove sense">×</button>
                )}
              </div>

              {/* Meanings within this sense */}
              <div className="editor-meanings">
                {sense.meanings.map((meaning, mi) => (
                  <div key={mi} className="editor-meaning">
                    <div className="editor-meaning-header">
                      <span className="editor-meaning-num">{mi + 1}.</span>
                      {sense.meanings.length > 1 && (
                        <button type="button" className="editor-remove-btn small" onClick={() => removeMeaning(si, mi)} aria-label="Remove meaning">×</button>
                      )}
                    </div>
                    <div className="editor-field">
                      <label>Definition *</label>
                      <input
                        type="text"
                        value={meaning.definition}
                        onChange={(e) => updateMeaning(si, mi, 'definition', e.target.value)}
                        placeholder="Definition text"
                      />
                    </div>
                    <div className="editor-field">
                      <label>Label</label>
                      <input
                        type="text"
                        value={meaning.label || ''}
                        onChange={(e) => updateMeaning(si, mi, 'label', e.target.value)}
                        placeholder="e.g. informal, archaic"
                      />
                    </div>

                    {/* Examples */}
                    <div className="editor-examples">
                      <label>Examples</label>
                      {(meaning.examples || []).map((ex, ei) => (
                        <div key={ei} className="editor-example-row">
                          <input
                            type="text"
                            value={ex}
                            onChange={(e) => updateExample(si, mi, ei, e.target.value)}
                            placeholder="Example sentence"
                          />
                          <button type="button" className="editor-remove-btn small" onClick={() => removeExample(si, mi, ei)} aria-label="Remove example">×</button>
                        </div>
                      ))}
                      <button type="button" className="editor-add-btn small" onClick={() => addExample(si, mi)}>+ Example</button>
                    </div>
                  </div>
                ))}
                <button type="button" className="editor-add-btn" onClick={() => addMeaning(si)}>+ Add Meaning</button>
              </div>
            </div>
          ))}
        </div>

        {/* Word Links */}
        <div className="editor-section">
          <div className="editor-section-header">
            <h4>Word Links</h4>
            <button type="button" className="editor-add-btn" onClick={addLink}>+ Add Link</button>
          </div>

          {links.length === 0 && <p className="editor-empty">No links added yet.</p>}

          {links.map((link, li) => (
            <div key={li} className="editor-link-row">
              <select
                value={typeof link.linkType === 'number' ? LINK_TYPES[link.linkType] : (link.linkType || 'Synonym')}
                onChange={(e) => updateLink(li, 'linkType', e.target.value)}
                aria-label="Link type"
              >
                {LINK_TYPES.map(t => (
                  <option key={t} value={t}>{LINK_TYPE_LABELS[t]}</option>
                ))}
              </select>
              <input
                type="text"
                value={link.targetWord || ''}
                onChange={(e) => updateLink(li, 'targetWord', e.target.value)}
                placeholder="Target word"
              />
              <input
                type="text"
                value={link.note || ''}
                onChange={(e) => updateLink(li, 'note', e.target.value)}
                placeholder="Note (optional)"
                style={{ flex: 0.7 }}
              />
              <button type="button" className="editor-remove-btn" onClick={() => removeLink(li)} aria-label="Remove link">×</button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="editor-actions">
          <button className="save-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : (isEdit ? 'Update' : 'Add Word')}
          </button>
          <button className="cancel-btn" onClick={onCancel} disabled={saving}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
