import { useState, useEffect, useCallback } from 'react';

export default function DictionaryManager() {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [formData, setFormData] = useState({ roman: '', urdu: '', hindi: '', meaning: '', category: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const q = search ? `?q=${encodeURIComponent(search)}&limit=100` : '?limit=100';
      const res = await fetch(`/api/dictionary${q}`);
      const data = await res.json();
      setEntries(data.entries || []);
      setTotal(data.total || 0);
    } catch {
      setMessage('Failed to load dictionary.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dictionary/stats');
      const data = await res.json();
      setStats(data);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchEntries(); fetchStats(); }, [fetchEntries]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchEntries();
  };

  const openAddForm = () => {
    setEditEntry(null);
    setFormData({ roman: '', urdu: '', hindi: '', meaning: '', category: '' });
    setShowForm(true);
  };

  const openEditForm = (entry) => {
    setEditEntry(entry);
    setFormData({
      roman: entry.roman || '',
      urdu: entry.urdu || '',
      hindi: entry.hindi || '',
      meaning: entry.meaning || '',
      category: entry.category || '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditEntry(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.roman.trim()) return;

    try {
      const url = editEntry ? `/api/dictionary/${editEntry.id}` : '/api/dictionary';
      const method = editEntry ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setMessage(editEntry ? 'Entry updated.' : 'Entry added.');
        closeForm();
        fetchEntries();
        fetchStats();
      } else {
        const data = await res.json();
        setMessage(data.error || 'Failed to save.');
      }
    } catch {
      setMessage('Failed to save entry.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      const res = await fetch(`/api/dictionary/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage('Entry deleted.');
        fetchEntries();
        fetchStats();
      }
    } catch {
      setMessage('Failed to delete.');
    }
  };

  return (
    <div className="dictionary-page">
      {stats && (
        <div className="stats-bar">
          <span><strong>{stats.total}</strong> words</span>
          <span>{stats.withUrdu} with Urdu</span>
          <span>{stats.withHindi} with Hindi</span>
        </div>
      )}

      <div className="dict-toolbar">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search words..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>
        <button className="add-btn" onClick={openAddForm}>+ Add Word</button>
      </div>

      {message && <p className="message" onClick={() => setMessage('')}>{message}</p>}

      {showForm && (
        <div className="form-overlay" onClick={closeForm}>
          <div className="form-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editEntry ? 'Edit Entry' : 'Add New Entry'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <label>Roman *</label>
                <input
                  type="text"
                  value={formData.roman}
                  onChange={(e) => setFormData({...formData, roman: e.target.value})}
                  required
                  placeholder="e.g. salam"
                />
              </div>
              <div className="form-row">
                <label>Urdu</label>
                <input
                  type="text"
                  dir="rtl"
                  value={formData.urdu}
                  onChange={(e) => setFormData({...formData, urdu: e.target.value})}
                  placeholder="e.g. سلام"
                />
              </div>
              <div className="form-row">
                <label>Hindi</label>
                <input
                  type="text"
                  value={formData.hindi}
                  onChange={(e) => setFormData({...formData, hindi: e.target.value})}
                  placeholder="e.g. सलाम"
                />
              </div>
              <div className="form-row">
                <label>Meaning</label>
                <input
                  type="text"
                  value={formData.meaning}
                  onChange={(e) => setFormData({...formData, meaning: e.target.value})}
                  placeholder="e.g. peace/hello"
                />
              </div>
              <div className="form-row">
                <label>Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  placeholder="e.g. greeting, verb, noun"
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="save-btn">
                  {editEntry ? 'Update' : 'Add'}
                </button>
                <button type="button" className="cancel-btn" onClick={closeForm}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="dict-table-wrap">
        {loading ? (
          <p className="loading">Loading...</p>
        ) : (
          <table className="dict-table">
            <thead>
              <tr>
                <th>Roman</th>
                <th>Urdu</th>
                <th>Hindi</th>
                <th>Meaning</th>
                <th>Category</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.roman}</td>
                  <td dir="rtl" className="script-cell">{entry.urdu}</td>
                  <td className="script-cell">{entry.hindi}</td>
                  <td>{entry.meaning}</td>
                  <td><span className="category-badge">{entry.category}</span></td>
                  <td className="actions-cell">
                    <button className="edit-btn" onClick={() => openEditForm(entry)}>Edit</button>
                    <button className="delete-btn" onClick={() => handleDelete(entry.id)}>Del</button>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr><td colSpan="6" className="empty-row">No entries found.</td></tr>
              )}
            </tbody>
          </table>
        )}
        {!loading && entries.length < total && (
          <p className="showing-info">Showing {entries.length} of {total} entries</p>
        )}
      </div>
    </div>
  );
}
