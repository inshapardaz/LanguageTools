import { useState, useEffect, useCallback } from 'react';

/**
 * Component for browsing and searching within a specific natural dictionary.
 * Shows paginated headword list with definitions, and a search bar for filtering.
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
    // Scroll to top of list
    document.querySelector('.browser-articles')?.scrollTo(0, 0);
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
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
      </div>

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
                      <div
                        className="article-definition"
                        dangerouslySetInnerHTML={{ __html: article.definition }}
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                disabled={page <= 1}
                onClick={() => goToPage(1)}
                aria-label="First page"
              >
                ««
              </button>
              <button
                className="page-btn"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
                aria-label="Previous page"
              >
                ‹
              </button>
              <span className="page-info">
                Page {page} of {totalPages}
              </span>
              <button
                className="page-btn"
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
                aria-label="Next page"
              >
                ›
              </button>
              <button
                className="page-btn"
                disabled={page >= totalPages}
                onClick={() => goToPage(totalPages)}
                aria-label="Last page"
              >
                »»
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
