import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Tabs from '../components/Tabs.jsx';
import DiscoveryBar from '../components/DiscoveryBar.jsx';
import RecruitFeed from '../components/RecruitFeed.jsx';
import PlayerRecruitFeed from '../components/PlayerRecruitFeed.jsx';
import ClanPostForm from '../components/ClanPostForm.jsx';
import RecruitDetail from '../components/RecruitDetail.jsx';
import useRecruitFeed from '../hooks/useRecruitFeed.js';
import usePlayerRecruitFeed from '../hooks/usePlayerRecruitFeed.js';
import { fetchJSON } from '../lib/api.js';
import Fuse from 'fuse.js';

export default function Scout() {
  const [active, setActive] = useState('find');
  const [filters, setFilters] = useState({});
  const feed = useRecruitFeed(filters);
  const playerFeed = usePlayerRecruitFeed(filters);
  const [params] = useSearchParams();
  const page = parseInt(params.get('page') || '1', 10);
  const [selected, setSelected] = useState(null);

  function joinClan(clan) {
    if (!navigator.onLine && 'serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then((sw) => sw.sync.register(`join-${clan.id}`));
    } else {
      fetchJSON(`/recruiting/join/${clan.id}`, { method: 'POST' }).catch(() => {});
    }
  }

  const items = useMemo(() => {
    let data = feed.items;
    if (filters.q) {
      const fuse = new Fuse(data, { keys: ['callToAction'] });
      data = fuse.search(filters.q).map((r) => r.item);
    }
    return data.sort((a, b) => b.ageValue - a.ageValue);
  }, [feed.items, filters.q]);

  const playerItems = playerFeed.items;

  const [message, setMessage] = useState('');

  async function postPlayer(e) {
    e.preventDefault();
    try {
      await fetchJSON('/player-recruit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: message }),
      });
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cache = await caches.open('player-recruit');
        const keys = await cache.keys();
        await Promise.all(keys.map((k) => cache.delete(k)));
      }
      setMessage('');
      playerFeed.reload();
    } catch (err) {
      // ignore
    }
  }

  function invitePlayer(player) {
    fetchJSON(`/invite/${player.id}`, { method: 'POST' }).catch(() => {});
  }

  useEffect(() => {
    setSelected(null);
  }, [active]);

  return (
    <div className="h-full flex flex-col">
      <Tabs
        tabs={[
          { value: 'find', label: 'Find a Clan' },
          { value: 'need', label: 'Need a Clan' },
        ]}
        active={active}
        onChange={setActive}
      />
      {active === 'find' && (
        <>
          <ClanPostForm onPosted={feed.reload} />
          <DiscoveryBar onChange={setFilters} />
          <div className="flex-1">
            <RecruitFeed
              items={items}
              loadMore={feed.loadMore}
              hasMore={feed.hasMore}
              onJoin={joinClan}
              onSelect={setSelected}
              initialPage={page}
            />
          </div>
        </>
      )}
      {active === 'need' && (
        <>
          <form onSubmit={postPlayer} className="p-3 border-b flex flex-col gap-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe yourself"
              className="border p-2 rounded"
            />
            <button
              type="submit"
              className="bg-blue-500 text-white py-1 px-2 rounded self-start"
            >
              Post
            </button>
          </form>
          <DiscoveryBar onChange={setFilters} />
          <div className="flex-1">
            <PlayerRecruitFeed
              items={playerItems}
              loadMore={playerFeed.loadMore}
              hasMore={playerFeed.hasMore}
              onInvite={invitePlayer}
              initialPage={page}
            />
          </div>
        </>
      )}
      {selected && (
        <RecruitDetail clan={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
