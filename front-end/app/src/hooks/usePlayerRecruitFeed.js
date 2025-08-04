import { useEffect, useState } from 'react';
import { fetchJSON } from '../lib/api.js';

export default function usePlayerRecruitFeed(filters) {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  async function fetchPage(c) {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('pageCursor', c || '');
    if (filters.q) params.set('q', filters.q);
    const path = `/player-recruit?${params.toString()}`;
    let data;
    if (typeof window !== 'undefined' && 'caches' in window && (!c || c === '')) {
      const cache = await caches.open('player-recruit');
      const cached = await cache.match(path);
      if (cached) {
        data = await cached.json();
        fetchJSON(path)
          .then((d) => cache.put(path, new Response(JSON.stringify(d))))
          .catch(() => {});
      } else {
        try {
          data = await fetchJSON(path);
          await cache.put(path, new Response(JSON.stringify(data)));
        } catch {
          data = { items: [], nextCursor: null };
        }
      }
    } else {
      try {
        data = await fetchJSON(path);
      } catch {
        data = { items: [], nextCursor: null };
      }
    }
    setItems((prev) => [...prev, ...data.items]);
    setCursor(data.nextCursor || '');
    setHasMore(Boolean(data.nextCursor));
    setLoading(false);
  }

  function reload() {
    setItems([]);
    setCursor('');
    setHasMore(true);
    fetchPage('');
  }

  useEffect(() => {
    reload();
  }, [filters.q]);

  return { items, loadMore: () => fetchPage(cursor), hasMore, loading, reload };
}
