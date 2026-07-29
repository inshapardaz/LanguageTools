import { useState } from 'react';
import Converter from './Converter';
import DictionaryManager from './DictionaryManager';
import NaturalDictionary from './NaturalDictionary';
import './styles.css';

export default function App() {
  const [page, setPage] = useState('converter');

  return (
    <div className="app">
      <header className="header">
        <h1>Script Converter</h1>
        <p>Transliterate between Urdu, Hindi, and Roman scripts</p>
        <nav className="nav-tabs">
          <button
            className={`nav-tab ${page === 'converter' ? 'active' : ''}`}
            onClick={() => setPage('converter')}
          >
            Converter
          </button>
          <button
            className={`nav-tab ${page === 'dictionary' ? 'active' : ''}`}
            onClick={() => setPage('dictionary')}
          >
            Dictionary
          </button>
          <button
            className={`nav-tab ${page === 'natural-dictionary' ? 'active' : ''}`}
            onClick={() => setPage('natural-dictionary')}
          >
            Natural Dictionary
          </button>
        </nav>
      </header>

      {page === 'converter' && <Converter />}
      {page === 'dictionary' && <DictionaryManager />}
      {page === 'natural-dictionary' && <NaturalDictionary />}
    </div>
  );
}
