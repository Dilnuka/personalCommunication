import { useState, useEffect } from 'react';
import { api } from '../services/api';
import Avatar from './Avatar';

export default function AddContactModal({ onClose, onContactAdded }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { users } = await api.searchUsers(query);
        setResults(users);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  async function handleAdd(user) {
    setAdding(user.id);
    setError('');
    try {
      const { contact } = await api.addContact(user.id);
      onContactAdded(contact);
      setQuery('');
      setResults([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[#1e293b] rounded-2xl border border-slate-700/50 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
          <h2 className="text-lg font-semibold text-white">Add contact</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username or name..."
            autoFocus
            className="w-full px-4 py-2.5 bg-[#0f172a] border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          />

          {error && (
            <p className="mt-3 text-sm text-red-400">{error}</p>
          )}

          <div className="mt-4 max-h-64 overflow-y-auto space-y-1">
            {loading && (
              <p className="text-center text-slate-400 py-4 text-sm">Searching...</p>
            )}
            {!loading && query.length >= 2 && results.length === 0 && (
              <p className="text-center text-slate-400 py-4 text-sm">No users found</p>
            )}
            {results.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-700/30 transition"
              >
                <Avatar name={user.displayName} color={user.avatarColor} status={user.status} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{user.displayName}</p>
                  <p className="text-sm text-slate-400 truncate">@{user.username}</p>
                </div>
                <button
                  onClick={() => handleAdd(user)}
                  disabled={adding === user.id}
                  className="px-3 py-1.5 text-sm font-medium bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg transition"
                >
                  {adding === user.id ? 'Adding...' : 'Add'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
