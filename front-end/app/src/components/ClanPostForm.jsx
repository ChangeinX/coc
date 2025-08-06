import React, { useEffect, useState } from 'react';
import { fetchJSON } from '../lib/api.js';
import Loading from './Loading.jsx';
import RecruitCard from './RecruitCard.jsx';

export default function ClanPostForm({ onPosted }) {
  const [callToAction, setCallToAction] = useState('');
  const [clan, setClan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [posting, setPosting] = useState(false);

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
    if (posting || !callToAction.trim()) return;
    setPosting(true);
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
      await onPosted?.();
      window.dispatchEvent(
        new CustomEvent('toast', { detail: 'Recruiting post created!' })
      );
    } catch (err) {
      // ignore
    } finally {
      setPosting(false);
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
    <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-2">
      <RecruitCard
        clanTag={clan.tag}
        name={clan.name}
        labels={clan.labels}
        language={clan.language}
        memberCount={clan.memberCount}
        warLeague={clan.warLeague}
        clanLevel={clan.clanLevel}
        requiredTrophies={clan.requiredTrophies}
        requiredTownhallLevel={clan.requiredTownhallLevel}
        callToAction={callToAction}
      />
      <textarea
        name="callToAction"
        value={callToAction}
        onChange={(e) => setCallToAction(e.target.value)}
        placeholder="Describe your clan"
        className="border p-2 rounded"
      />
      <button
        type="submit"
        disabled={posting}
        className="bg-blue-500 text-white py-1 px-2 rounded self-start disabled:opacity-50"
      >
        {posting ? 'Posting...' : 'Post'}
      </button>
    </form>
  );
}

