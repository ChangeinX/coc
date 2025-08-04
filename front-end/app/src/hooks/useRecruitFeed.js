import { useEffect, useState } from 'react';
import { fetchJSON } from '../lib/api.js';

export default function useRecruitFeed(filters) {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  async function fetchPage(c) {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('pageCursor', c || '');
    if (filters.q) params.set('q', filters.q);
    const path = `/recruiting/recruit?${params.toString()}`;
    let data;
    if (typeof window !== 'undefined' && 'caches' in window && (!c || c === '')) {
      const cache = await caches.open('recruit');
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
    const normalized = data.items.map((item) => {
      const { clan = {}, call_to_action, callToAction, ...rest } = item.data || {};
      return {
        ...item,
        data: {
          ...rest,
          clanTag: clan.tag,
          deepLink: clan.deep_link ?? clan.deepLink,
          name: clan.name,
          description: clan.description,
          labels: clan.labels,
          warFrequency: clan.warFrequency,
          language: clan.chatLanguage ?? clan.language,
          openSlots: rest.openSlots ?? clan.openSlots,
          callToAction: call_to_action ?? callToAction,
        },
      };
    });
    setItems((prev) => [...prev, ...normalized]);
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
