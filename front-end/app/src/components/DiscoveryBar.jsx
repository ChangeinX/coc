import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const leagues = ['None', 'Bronze', 'Silver', 'Gold', 'Crystal', 'Master', 'Champion'];
const languages = ['Any', 'English', 'Spanish', 'French'];
const warTypes = ['Any', 'Casual', 'Competitive'];

export default function DiscoveryBar({ onChange }) {
  const [params, setParams] = useSearchParams();
  const filters = {
    league: params.get('league') || 'None',
    language: params.get('lang') || 'Any',
    war: params.get('war') || 'Any',
    q: params.get('q') || '',
    sort: params.get('sort') || 'open',
  };

  useEffect(() => {
    onChange?.(filters);
  }, [params]);

  function update(key, value) {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next);
    if (Notification && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  return (
    <div className="sticky top-0 z-10 bg-white p-2 shadow flex gap-2 overflow-x-auto">
      <select
        value={filters.league}
        onChange={(e) => update('league', e.target.value)}
        className="border rounded p-1 text-sm"
      >
        {leagues.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
      <select
        value={filters.language}
        onChange={(e) => update('lang', e.target.value)}
        className="border rounded p-1 text-sm"
      >
        {languages.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
      <select
        value={filters.war}
        onChange={(e) => update('war', e.target.value)}
        className="border rounded p-1 text-sm"
      >
        {warTypes.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
      <input
        value={filters.q}
        onChange={(e) => update('q', e.target.value)}
        placeholder="Search"
        className="flex-1 border rounded p-1 text-sm"
      />
      <button
        type="button"
        onClick={() =>
          update('sort', filters.sort === 'open' ? 'new' : 'open')
        }
        className="border rounded px-2 text-sm"
      >
        Sort: {filters.sort}
      </button>
    </div>
  );
}
