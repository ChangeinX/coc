import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function DiscoveryBar({ onChange }) {
  const [params, setParams] = useSearchParams();
  const filters = {
    q: params.get('q') || '',
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
      <input
        value={filters.q}
        onChange={(e) => update('q', e.target.value)}
        placeholder="Search"
        className="flex-1 border rounded p-1 text-sm"
      />
    </div>
  );
}
