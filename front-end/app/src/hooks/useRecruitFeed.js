import { useEffect, useState } from 'react';

export default function useRecruitFeed(filters) {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  async function fetchPage(c) {
    setLoading(true);
    const url = `/recruit?pageCursor=${c || ''}`;
    let data;
    if (typeof window !== 'undefined' && 'caches' in window && (!c || c === '')) {
      const cache = await caches.open('recruit');
      const cached = await cache.match(url);
      if (cached) {
        data = await cached.json();
        fetch(url)
          .then((r) => cache.put(url, r.clone()))
          .catch(() => {});
      } else {
        const res = await fetch(url).catch(() => null);
        if (res) {
          cache.put(url, res.clone());
          data = await res.json();
        } else {
          data = { items: [], nextCursor: null };
        }
      }
    } else {
      const res = await fetch(url).catch(() => null);
      data = res ? await res.json() : { items: [], nextCursor: null };
    }
    setItems((prev) => [...prev, ...data.items]);
    setCursor(data.nextCursor || '');
    setHasMore(Boolean(data.nextCursor));
    setLoading(false);
  }

  useEffect(() => {
    setItems([]);
    setCursor('');
    setHasMore(true);
    fetchPage('');
  }, [filters.league, filters.language, filters.war, filters.q, filters.sort]);

  return { items, loadMore: () => fetchPage(cursor), hasMore, loading };
}
