import { useState, useEffect, useCallback } from 'react';
import ArticleView from './ArticleView';
import ArticleEditor from './ArticleEditor';
import MergeDuplicates from './MergeDuplicates';

/**
 * Component for browsing and searching within a specific natural dictionary.
 * Shows paginated headword list with structured definitions, and supports
 * adding, editing, and deleting articles.
 */
export default function DictionaryBrowser({ dictionaryId, dictionaryName, onBack }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | article object
  const [showMerge, setShowMerge] = useState(false);
  const [message, setMessage] = useState('');
  const pageSize = 50;

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

  useEffect(() => {
    fetchArticles(1, '');
  }, [fetchArticles]);

  const handleSearch = (e) => {
    e.preventDefault();
    setActiveSearch(searchQuery);
    setPage(1);
    fetchArticles(1, searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSearch('');
    setPage(1);
    fetchArticles(1, '');
  };

  const goToPage = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    fetchArticles(p, activeSearch);
    document.querySelector('.browser-articles')?.scrollTo(0, 0);
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleDelete = async (articleId, headword) => {
    if (!confirm(`Delete "${headword}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/natural-dictionary/articles/${articleId}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage(`Deleted "${headword}".`);
        setTotalCount(c => c - 1);
        fetchArticles(page, activeSearch);
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
