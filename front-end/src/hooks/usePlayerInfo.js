import { useEffect, useState } from 'react';
import { fetchJSONCached } from '../lib/api.js';
import { getPlayerCache, putPlayerCache } from '../lib/db.js';

const PLAYER_TTL = 5 * 60 * 1000; // 5 minutes

export default function usePlayerInfo(tag) {
  const [player, setPlayer] = useState(null);

  useEffect(() => {
    if (!tag) {
      setPlayer(null);
      return;
    }
    let cancelled = false;
    const key = `player:${tag}`;
    (async () => {
      const cached = await getPlayerCache(key);
      if (cached) {
        setPlayer(cached.data);
        if (Date.now() - cached.ts < PLAYER_TTL) {
          return;
        }
      }
      fetchJSONCached(`/player/${encodeURIComponent(tag)}`)
        .then(async (data) => {
          if (cancelled) return;
          setPlayer(data);
          try {
            await putPlayerCache({ key, ts: Date.now(), data });
          } catch (err) {
            console.error('Failed to cache player info', err);
          }
        })
        .catch((err) => {
          console.error('Failed to load player info', err);
        });
    })();
    return () => {
      cancelled = true;
    };
  }, [tag]);

  return player;
}
