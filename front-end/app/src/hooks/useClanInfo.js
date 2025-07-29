import { useEffect, useState } from 'react';
import { fetchJSONCached } from '../lib/api.js';
import { getClanCache, putClanCache } from '../lib/db.js';

const CLAN_TTL = 5 * 60 * 1000; // 5 minutes

export default function useClanInfo(tag) {
  const [clan, setClan] = useState(null);

  useEffect(() => {
    if (!tag) {
      setClan(null);
      return;
    }
    let cancelled = false;
    const key = `clan:${tag}`;
    (async () => {
      const cached = await getClanCache(key);
      if (cached && cached.clan) {
        setClan(cached.clan);
        if (Date.now() - (cached.ts || 0) < CLAN_TTL) {
          return;
        }
      }
      fetchJSONCached(`/clan/${encodeURIComponent(tag)}`)
        .then(async (data) => {
          if (cancelled) return;
          setClan(data);
          try {
            await putClanCache({ ...(cached || {}), key, clan: data, ts: Date.now() });
          } catch (err) {
            console.error('Failed to cache clan info', err);
          }
        })
        .catch((err) => {
          console.error('Failed to load clan info', err);
        });
    })();
    return () => {
      cancelled = true;
    };
  }, [tag]);

  return clan;
}
