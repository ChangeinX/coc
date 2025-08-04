import React, { useEffect, useState } from 'react';
import { fetchJSON } from '../lib/api.js';
import CachedImage from './CachedImage.jsx';
import { useAuth } from '../hooks/useAuth.jsx';

export default function ClanPostForm({ onPosted }) {
  const { user } = useAuth();
  const [callToAction, setCallToAction] = useState('');
  const [clan, setClan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadClan() {
      if (!user?.player_tag) {
        setLoading(false);
        setError(true);
        return;
      }
      try {
        setLoading(true);
        setError(false);
        const player = await fetchJSON(`/player/${encodeURIComponent(user.player_tag)}`);
        if (cancelled) return;
        if (!player?.clanTag) {
          setError(true);
          setLoading(false);
          return;
        }
        const c = await fetchJSON(`/clan/${encodeURIComponent(player.clanTag)}`);
        if (cancelled) return;
        setClan(c);
      } catch (err) {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadClan();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!clan) return;
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

  if (loading) {
    return <div className="p-3 border-b text-sm">Loading clan…</div>;
  }

  if (error || !clan) {
    return (
      <div className="p-3 border-b text-sm text-red-500">
        Unable to load clan data.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 border-b flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {clan.badgeUrls?.small && (
          <CachedImage
            src={clan.badgeUrls.small}
            alt="Clan badge"
            className="w-10 h-10"
          />
        )}
        <div>
          <div className="font-semibold">{clan.name}</div>
          <div className="text-xs text-slate-500">
            {(clan.labels || []).map((l) => l.name).join(', ')}
          </div>
        </div>
      </div>
      <textarea
        name="callToAction"
        value={callToAction}
        onChange={(e) => setCallToAction(e.target.value)}
        placeholder="Call to action (optional)"
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

