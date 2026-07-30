import { useState, useEffect } from 'react';

/**
 * Modal component that finds and merges duplicate headwords in a dictionary.
 * Detects headwords with suffixes like [1], [2], (1), (2) and allows
 * merging them into a single article that combines all senses.
 */
export default function MergeDuplicates({ dictionaryId, onClose, onMergeComplete }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(null); // group being merged
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [mergedCount, setMergedCount] = useState(0);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/natural-dictionary/${dictionaryId}/merge-candidates?limit=200`);
      const data = await res.json();
      setGroups(data.groups || []);
    } catch {
      setError('Failed to load merge candidates.');
    } finally {
      setLoading(false);
    }
  };

  const handleMerge = async (group) => {
    setMerging(group.baseHeadword);
    setError('');
    setMessage('');

    const articleIds = group.articles.map(a => a.id);

    try {
      const res = await fetch(`/api/natural-dictionary/${dictionaryId}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleIds, headword: group.baseHeadword }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Merge failed.');
        return;
      }

      const data = await res.json();
      setMessage(data.message);
      setMergedCount(c => c + 1);

      // Remove the merged group from the list
      setGroups(prev => prev.filter(g => g.baseHeadword !== group.baseHeadword));
    } catch {
      setError('Merge failed. Please try again.');
    } finally {
      setMerging(null);
    }
  };

  const handleMergeAll = async () => {
    if (!confirm(`Merge all ${groups.length} groups? This will combine articles with similar headwords.`))
      return;

    setError('');
    setMessage('');
    let merged = 0;

    for (const group of [...groups]) {
      setMerging(group.baseHeadword);
      const articleIds = group.articles.map(a => a.id);

      try {
        const res = await fetch(`/api/natural-dictionary/${dictionaryId}/merge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleIds, headword: group.baseHeadword }),
        });

        if (res.ok) {
          merged++;
          setGroups(prev => prev.filter(g => g.baseHeadword !== group.baseHeadword));
        }
      } catch { /* continue */ }
    }

    setMerging(null);
    setMergedCount(c => c + merged);
    setMessage(`Merged ${merged} groups successfully.`);
  };

  return (
    <div className="form-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="merge-modal">
        <div className="merge-header">
          <h3>Merge Duplicate Headwords</h3>
          <button className="merge-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <p className="merge-description">
          Articles with similar headwords (e.g. "word [1]", "word [2]") can be merged into
          a single entry that combines all their senses and meanings.
        </p>

        {error && <div className="editor-error">{error}</div>}
        {message && <div className="message" onClick={() => setMessage('')}>{message}</div>}

        {loading ? (
          <div className="loading">Scanning for duplicates...</div>
        ) : groups.length === 0 ? (
          <div className="merge-empty">
            {mergedCount > 0
              ? `All done! Merged ${mergedCount} group${mergedCount !== 1 ? 's' : ''}.`
              : 'No duplicate headwords found.'}
          </div>
        ) : (
          <>
            <div className="merge-toolbar">
              <span className="merge-count">{groups.length} groups with duplicates</span>
              <button className="merge-all-btn" onClick={handleMergeAll} disabled={!!merging}>
                Merge All
              </button>
            </div>

            <div className="merge-list">
              {groups.map((group) => (
                <div key={group.baseHeadword} className="merge-group">
                  <div className="merge-group-header">
                    <div className="merge-group-info">
                      <span className="merge-group-name">{group.baseHeadword}</span>
                      <span className="merge-group-count">{group.count} articles</span>
                    </div>
                    <button
                      className="merge-btn"
                      onClick={() => handleMerge(group)}
                      disabled={!!merging}
                    >
                      {merging === group.baseHeadword ? 'Merging...' : 'Merge'}
                    </button>
                  </div>
                  <div className="merge-group-articles">
                    {group.articles.map((a) => (
                      <div key={a.id} className="merge-article-item">
                        <span className="merge-article-headword">{a.headword}</span>
                        <span className="merge-article-meta">
                          {a.sensesCount} sense{a.sensesCount !== 1 ? 's' : ''}, {a.meaningsCount} meaning{a.meaningsCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="merge-footer">
          <button className="cancel-btn" onClick={() => { if (mergedCount > 0) onMergeComplete(); onClose(); }}>
            {mergedCount > 0 ? 'Done' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
