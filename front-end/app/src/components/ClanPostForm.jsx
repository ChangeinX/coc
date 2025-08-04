import React, { useEffect, useState } from 'react';
import { fetchJSON } from '../lib/api.js';
import Loading from './Loading.jsx';

export default function ClanPostForm({ onPosted }) {
  const [callToAction, setCallToAction] = useState('');
  const [clan, setClan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const me = await fetchJSON('/user/me');
        const playerTag = me.player_tag;
        if (!playerTag) throw new Error('no player tag');
        const player = await fetchJSON(`/player/${encodeURIComponent(playerTag)}`);
        if (!player.clanTag) throw new Error('no clan');
        const data = await fetchJSON(`/clan/${encodeURIComponent(player.clanTag)}`);
        if (!cancelled) {
          setClan(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError('Failed to load clan');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await fetchJSON('/recruiting/recruit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clanTag: clan.tag, callToAction }),
      });
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cache = await caches.open('recruit');
        const keys = await cache.keys();
        await Promise.all(keys.map((k) => cache.delete(k)));
      }
      setCallToAction('');
      onPosted?.();
      window.dispatchEvent(
        new CustomEvent('toast', { detail: 'Recruiting post created!' })
      );
    } catch (err) {
      // ignore
    }
  }

  if (loading) return <Loading className="p-3 border-b" />;
  if (error || !clan)
    return (
      <div className="p-3 border-b text-sm text-red-500">
        {error || 'Clan not found'}
      </div>
    );

  return (
    <form onSubmit={handleSubmit} className="p-3 border-b flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {clan.badgeUrls?.small && (
          <img src={clan.badgeUrls.small} alt="clan badge" className="w-8 h-8" />
        )}
        <div>
          <div className="font-semibold">{clan.name}</div>
          <div className="flex flex-wrap gap-1">
            {clan.labels?.map((l) => (
              <span key={l.id} className="text-xs bg-slate-200 px-1 rounded">
                {l.name}
              </span>
            ))}
          </div>
        </div>
      </div>
      <textarea
        name="callToAction"
        value={callToAction}
        onChange={(e) => setCallToAction(e.target.value)}
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

