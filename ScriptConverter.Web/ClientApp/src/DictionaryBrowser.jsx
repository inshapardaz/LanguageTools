import { useState, useEffect, useCallback, useRef } from 'react';
import ArticleView from './ArticleView';
import ArticleEditor from './ArticleEditor';
import MergeDuplicates from './MergeDuplicates';

/**
 * Component for browsing and searching within a specific natural dictionary.
 * Syncs page, search query, and expanded word to URL query params so that
 * refreshing the page preserves full state.
 *
 * URL params: ?page=N&q=search&word=articleId
 */
export default function DictionaryBrowser({ dictionaryId, dictionaryName, urlParams, onUpdateParams, onBack }) {
  // Initialize state from URL params
  const initialPage = parseInt(urlParams?.page) || 1;
  const initialQuery = urlParams?.q || '';
  const initialWord = urlParams?.word ? parseInt(urlParams.word) : null;

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeSearch, setActiveSearch] = useState(initialQuery);
  const [page, setPage] = useState(initialPage);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [expandedId, setExpandedId] = useState(initialWord);
  const [editing, setEditing] = useState(null);
  const [showMerge, setShowMerge] = useState(false);
  const [message, setMessage] = useState('');
  const pageSize = 50;

  // Track whether this is the initial mount to avoid double-fetching
  const isInitialMount = useRef(true);

  // Sync state to URL whenever page, activeSearch, or expandedId changes
  const syncUrl = useCallback((p, q, wordId) => {
    const params = {};
    if (p > 1) params.page = String(p);
    if (q) params.q = q;
    if (wordId) params.word = String(wordId);
    onUpdateParams?.(params);
  }, [onUpdateParams]);

  const fetchArticles = useCallback(async (p, query) => {
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
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [dictionaryId]);

  // Initial fetch using URL params
  useEffect(() => {
    fetchArticles(initialPage, initialQuery);
    isInitialMount.current = false;
  }, [fetchArticles]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    setActiveSearch(q);
    setPage(1);
    setExpandedId(null);
    fetchArticles(1, q);
    syncUrl(1, q, null);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSearch('');
    setPage(1);
    setExpandedId(null);
    fetchArticles(1, '');
    syncUrl(1, '', null);
  };

  const goToPage = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    setExpandedId(null);
    fetchArticles(p, activeSearch);
    syncUrl(p, activeSearch, null);
    document.querySelector('.browser-articles')?.scrollTo(0, 0);
  };

  const toggleExpand = (id) => {
    const newId = expandedId === id ? null : id;
    setExpandedId(newId);
    syncUrl(page, activeSearch, newId);
  };

  const handleDelete = async (articleId, headword) => {
    if (!confirm(`Delete "${headword}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/natural-dictionary/articles/${articleId}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage(`Deleted "${headword}".`);
        setTotalCount(c => c - 1);
        if (expandedId === articleId) setExpandedId(null);
        fetchArticles(page, activeSearch);
        syncUrl(page, activeSearch, null);
      }
    } catch { /* ignore */ }
  };

  const handleSaveComplete = (saved) => {
    setEditing(null);
    const action = saved.id && articles.some(a => a.id === saved.id) ? 'Updated' : 'Added';
    setMessage(`${action} "${saved.headword}".`);
    fetchArticles(page, activeSearch);
  };

  return (
    <div className="dictionary-browser">
      {/* Header */}
      <div className="browser-header">
        <button className="back-btn" onClick={onBack} aria-label="Back to dictionary list">
          ← Back
        </button>
        <div className="browser-title">
          <h3>{dictionaryName}</h3>
          <span className="browser-count">{totalCount.toLocaleString()} entries</span>
        </div>
        <button className="add-btn" onClick={() => setEditing('new')}>+ Add Word</button>
        <button className="merge-trigger-btn" onClick={() => setShowMerge(true)}>Merge Duplicates</button>
        <div className="export-dropdown">
          <button className="export-btn" aria-label="Export dictionary">Export ▾</button>
          <div className="export-menu">
            <a href={`/api/natural-dictionary/${dictionaryId}/export?format=stardict`} download>StarDict</a>
            <a href={`/api/natural-dictionary/${dictionaryId}/export?format=dsl`} download>DSL (Lingvo)</a>
            <a href={`/api/natural-dictionary/${dictionaryId}/export?format=kobo`} download>Kobo Reader</a>
            <a href={`/api/natural-dictionary/${dictionaryId}/export?format=kindle`} download>Kindle (OPF)</a>
            <a href={`/api/natural-dictionary/${dictionaryId}/export?format=json`} download>JSON</a>
          </div>
        </div>
      </div>

      {/* Messages */}
      {message && <div className="message" onClick={() => setMessage('')}>{message}</div>}

      {/* Search bar */}
      <form className="browser-search" onSubmit={handleSearch}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search headwords..."
          aria-label="Search headwords in this dictionary"
        />
        <button type="submit" className="search-btn">Search</button>
        {activeSearch && (
          <button type="button" className="clear-search-btn" onClick={handleClearSearch}>
            Clear
          </button>
        )}
      </form>

      {activeSearch && (
        <div className="search-info">
          Showing results for "<strong>{activeSearch}</strong>" — {totalCount} match{totalCount !== 1 ? 'es' : ''}
        </div>
      )}

      {/* Articles list */}
      {loading ? (
        <div className="loading">Loading entries...</div>
      ) : (
        <>
          <div className="browser-articles">
            {articles.length === 0 ? (
              <div className="empty-row" style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                {activeSearch ? 'No entries match your search.' : 'This dictionary has no entries.'}
              </div>
            ) : (
              articles.map((article) => (
                <div
                  key={article.id}
                  className={`article-card ${expandedId === article.id ? 'expanded' : ''}`}
                >
                  <div
                    className="article-header"
                    onClick={() => toggleExpand(article.id)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={expandedId === article.id}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleExpand(article.id); }}
                  >
                    <span className="article-headword">{article.headword}</span>
                    <span className="article-expand-icon">{expandedId === article.id ? '▼' : '▶'}</span>
                  </div>
                  {expandedId === article.id && (
                    <div className="article-body">
                      <ArticleView article={article} />
                      <div className="article-actions">
                        <button className="edit-btn" onClick={(e) => { e.stopPropagation(); setEditing(article); }}>Edit</button>
                        <button className="delete-btn" onClick={(e) => { e.stopPropagation(); handleDelete(article.id, article.headword); }}>Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button className="page-btn" disabled={page <= 1} onClick={() => goToPage(1)} aria-label="First page">««</button>
              <button className="page-btn" disabled={page <= 1} onClick={() => goToPage(page - 1)} aria-label="Previous page">‹</button>
              <span className="page-info">Page {page} of {totalPages}</span>
              <button className="page-btn" disabled={page >= totalPages} onClick={() => goToPage(page + 1)} aria-label="Next page">›</button>
              <button className="page-btn" disabled={page >= totalPages} onClick={() => goToPage(totalPages)} aria-label="Last page">»»</button>
            </div>
          )}
        </>
      )}

      {/* Article Editor Modal */}
      {editing && (
        <ArticleEditor
          article={editing === 'new' ? null : editing}
          dictionaryId={dictionaryId}
          onSave={handleSaveComplete}
          onCancel={() => setEditing(null)}
        />
      )}

      {/* Merge Duplicates Modal */}
      {showMerge && (
        <MergeDuplicates
          dictionaryId={dictionaryId}
          onClose={() => setShowMerge(false)}
          onMergeComplete={() => fetchArticles(page, activeSearch)}
        />
      )}
    </div>
  );
}
