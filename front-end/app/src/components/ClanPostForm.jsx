import React, { useState } from 'react';
import { fetchJSON } from '../lib/api.js';

export default function ClanPostForm({ onPosted }) {
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [slots, setSlots] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const body = {
        description,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        slots: parseInt(slots, 10) || 0,
      };
      await fetchJSON('/recruit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          const cache = await caches.open('recruit');
          const keys = await cache.keys();
          await Promise.all(keys.map((k) => cache.delete(k)));
        } catch {
          // ignore
        }
      }
      setDescription('');
      setTags('');
      setSlots('');
      onPosted?.();
    } catch (err) {
      setError('Failed to post');
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 border-b flex flex-col gap-2">
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe your clan"
        className="border p-2 rounded"
      />
      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="Tags (comma separated)"
        className="border p-2 rounded"
      />
      <input
        value={slots}
        onChange={(e) => setSlots(e.target.value)}
        placeholder="Open slots"
        type="number"
        className="border p-2 rounded w-32"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        className="bg-blue-500 text-white py-1 px-2 rounded self-start"
        disabled={loading}
      >
        {loading ? 'Posting…' : 'Post'}
      </button>
    </form>
  );
}

