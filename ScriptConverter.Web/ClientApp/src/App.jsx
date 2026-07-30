import { useState, useEffect, useCallback } from 'react';
import Converter from './Converter';
import DictionaryManager from './DictionaryManager';
import NaturalDictionary from './NaturalDictionary';
import './styles.css';

/**
 * Parse the current URL path + query string into a route object.
 *
 * Supported routes:
 *   /                        → converter
 *   /converter               → converter
 *   /dictionary              → dictionary manager
 *   /natural-dictionary      → natural dictionary list
 *   /natural-dictionary/:id  → browsing a specific dictionary (with ?page=&q=&word= params)
 */
function parseRoute() {
  const path = window.location.pathname.replace(/^\/+/, '') || 'converter';
  const parts = path.split('/');
  const params = Object.fromEntries(new URLSearchParams(window.location.search));

  if (parts[0] === 'natural-dictionary' && parts[1]) {
    return { page: 'natural-dictionary', dictionaryId: parts[1], params };
  }

  return { page: parts[0] || 'converter', dictionaryId: null, params };
}

/**
 * Navigate to a path with optional query params using History API.
 */
function navigate(path, params, replace = false) {
  let url = '/' + path;
  if (params && Object.keys(params).length > 0) {
    const qs = Object.entries(params)
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    if (qs) url += '?' + qs;
  }

  if (replace) {
    window.history.replaceState(null, '', url);
  } else {
    window.history.pushState(null, '', url);
  }

  // Dispatch a custom event so the app re-renders
  window.dispatchEvent(new Event('routechange'));
}

/**
 * Update only the query params, keeping the current path. Uses replaceState
 * to avoid polluting browser history with every param change.
 */
function updateParams(params) {
  const path = window.location.pathname.replace(/^\/+/, '') || 'converter';
  navigate(path, params, true);
}

export default function App() {
  const [route, setRoute] = useState(parseRoute);

  useEffect(() => {
    const handleChange = () => setRoute(parseRoute());
    // Listen for back/forward
    window.addEventListener('popstate', handleChange);
    // Listen for our programmatic navigations
    window.addEventListener('routechange', handleChange);
    return () => {
      window.removeEventListener('popstate', handleChange);
      window.removeEventListener('routechange', handleChange);
    };
  }, []);

  const setPage = useCallback((page) => {
    navigate(page);
  }, []);

  const browseDictionary = useCallback((id, params) => {
    navigate(`natural-dictionary/${id}`, params);
  }, []);

  const backToList = useCallback(() => {
    navigate('natural-dictionary');
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>Script Converter</h1>
        <p>Transliterate between Urdu, Hindi, and Roman scripts</p>
        <nav className="nav-tabs">
          <button
            className={`nav-tab ${route.page === 'converter' ? 'active' : ''}`}
            onClick={() => setPage('converter')}
          >
            Converter
          </button>
          <button
            className={`nav-tab ${route.page === 'dictionary' ? 'active' : ''}`}
            onClick={() => setPage('dictionary')}
          >
            Dictionary
          </button>
          <button
            className={`nav-tab ${route.page === 'natural-dictionary' ? 'active' : ''}`}
            onClick={() => setPage('natural-dictionary')}
          >
            Natural Dictionary
          </button>
        </nav>
      </header>

      {route.page === 'converter' && <Converter />}
      {route.page === 'dictionary' && <DictionaryManager />}
      {route.page === 'natural-dictionary' && (
        <NaturalDictionary
          activeDictionaryId={route.dictionaryId}
          urlParams={route.params}
          onBrowse={browseDictionary}
          onBackToList={backToList}
          onUpdateParams={updateParams}
        />
      )}
    </div>
  );
}
