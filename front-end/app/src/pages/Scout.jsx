import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Tabs from '../components/Tabs.jsx';
import DiscoveryBar from '../components/DiscoveryBar.jsx';
import RecruitFeed from '../components/RecruitFeed.jsx';
import useRecruitFeed from '../hooks/useRecruitFeed.js';
import Fuse from 'fuse.js';

export default function Scout() {
  const [active, setActive] = useState('find');
  const [filters, setFilters] = useState({});
  const feed = useRecruitFeed(filters);
  const [params] = useSearchParams();
  const page = parseInt(params.get('page') || '1', 10);

  function joinClan(clan) {
    if (!navigator.onLine && 'serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then((sw) => sw.sync.register(`join-${clan.id}`));
    } else {
      fetch(`/join/${clan.id}`, { method: 'POST' });
    }
  }

  const items = useMemo(() => {
    let data = feed.items;
    if (filters.q) {
      const fuse = new Fuse(data, { keys: ['name', 'description', 'tags'] });
      data = fuse.search(filters.q).map((r) => r.item);
    }
    if (filters.league && filters.league !== 'None') {
      data = data.filter((d) => d.league === filters.league);
    }
    if (filters.language && filters.language !== 'Any') {
      data = data.filter((d) => d.language === filters.language);
    }
    if (filters.war && filters.war !== 'Any') {
      data = data.filter((d) => d.war === filters.war);
    }
    if (filters.sort === 'new') {
      data = [...data].sort((a, b) => b.ageValue - a.ageValue);
    } else {
      data = [...data].sort((a, b) => b.openSlots - a.openSlots);
    }
    return data;
  }, [feed.items, filters]);

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
          <DiscoveryBar onChange={setFilters} />
          <div className="flex-1">
            <RecruitFeed
              items={items}
              loadMore={feed.loadMore}
              hasMore={feed.hasMore}
              onJoin={joinClan}
              initialPage={page}
            />
          </div>
        </>
      )}
      {active === 'need' && <p>Coming soon...</p>}
    </div>
  );
}
