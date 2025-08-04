import React, { useState } from 'react';
import { fetchJSON } from '../lib/api.js';

export default function ClanPostForm({ onPosted }) {
  const [form, setForm] = useState({ callToAction: '' });

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
        body: JSON.stringify({ callToAction: form.callToAction }),
      });
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cache = await caches.open('recruit');
        const keys = await cache.keys();
        await Promise.all(keys.map((k) => cache.delete(k)));
      }
      setForm({ callToAction: '' });
      onPosted?.();
      window.dispatchEvent(
        new CustomEvent('toast', { detail: 'Recruiting post created!' })
      );
    } catch (err) {
      // ignore
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 border-b flex flex-col gap-2">
      <textarea
        name="callToAction"
        value={form.callToAction}
        onChange={handleChange}
        placeholder="Describe your clan"
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

