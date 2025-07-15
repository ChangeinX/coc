import React, { useState } from 'react';
import { fetchJSON } from '../lib/api.js';
import Loading from './Loading.jsx';

export default function PlayerTagForm({ onSaved }) {
  const [tag, setTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    let trimmed = tag.trim();
    if (!trimmed) return;
    if (trimmed.startsWith('#')) trimmed = trimmed.slice(1);
    setLoading(true);
    setError('');
    try {
      const res = await fetchJSON('/user/player-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_tag: trimmed }),
      });
      onSaved(res.player_tag);
    } catch (err) {
      setError('Failed to save');
    }
    setLoading(false);
  };

  return (
    <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow space-y-4 w-full max-w-sm">
        <p className="font-medium text-slate-700">Enter your player tag</p>
        <input
          className="w-full px-3 py-2 rounded border"
          placeholder="Player tag (e.g. #ABC123)"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          className="w-full px-4 py-2 rounded bg-slate-800 text-white"
          disabled={loading}
        >
          {loading ? 'Saving…' : 'Save'}
        </button>
      </form>
    </div>
  );
}
