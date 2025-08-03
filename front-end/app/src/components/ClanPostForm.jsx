import React, { useState } from 'react';
import { fetchJSON } from '../lib/api.js';

export default function ClanPostForm({ onPosted }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    tags: '',
    openSlots: '',
    totalSlots: '',
    league: '',
    language: '',
    war: '',
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await fetchJSON('/recruiting/recruit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          tags: form.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          openSlots: parseInt(form.openSlots, 10),
          totalSlots: parseInt(form.totalSlots, 10),
          league: form.league,
          language: form.language,
          war: form.war,
        }),
      });
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cache = await caches.open('recruit');
        const keys = await cache.keys();
        await Promise.all(keys.map((k) => cache.delete(k)));
      }
      setForm({
        name: '',
        description: '',
        tags: '',
        openSlots: '',
        totalSlots: '',
        league: '',
        language: '',
        war: '',
      });
      onPosted?.();
    } catch (err) {
      // ignore
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 border-b flex flex-col gap-2">
      <input
        name="name"
        value={form.name}
        onChange={handleChange}
        placeholder="Clan name"
        className="border p-2 rounded"
      />
      <textarea
        name="description"
        value={form.description}
        onChange={handleChange}
        placeholder="Describe your clan"
        className="border p-2 rounded"
      />
      <input
        name="tags"
        value={form.tags}
        onChange={handleChange}
        placeholder="Tags (comma separated)"
        className="border p-2 rounded"
      />
      <input
        type="number"
        name="openSlots"
        value={form.openSlots}
        onChange={handleChange}
        placeholder="Open slots"
        className="border p-2 rounded"
      />
      <input
        type="number"
        name="totalSlots"
        value={form.totalSlots}
        onChange={handleChange}
        placeholder="Total slots"
        className="border p-2 rounded"
      />
      <input
        name="league"
        value={form.league}
        onChange={handleChange}
        placeholder="League"
        className="border p-2 rounded"
      />
      <input
        name="language"
        value={form.language}
        onChange={handleChange}
        placeholder="Language"
        className="border p-2 rounded"
      />
      <input
        name="war"
        value={form.war}
        onChange={handleChange}
        placeholder="War frequency"
        className="border p-2 rounded"
      />
      <button
        type="submit"
        className="bg-blue-500 text-white py-1 px-2 rounded self-start"
      >
        Post
      </button>
    </form>
  );
}

