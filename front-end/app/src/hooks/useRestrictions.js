import { useEffect, useState } from 'react';
import { fetchJSON } from '../lib/api.js';

export default function useRestrictions(userId) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!userId) {
      setData(null);
      return;
    }
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetchJSON(
          `/chat/restrictions/${encodeURIComponent(userId)}`,
        );
        if (!cancelled) setData(res);
      } catch (err) {
        console.error('Failed to fetch restrictions', err);
      }
    };

    load();

    const handler = () => {
      if (!cancelled) load();
    };
    window.addEventListener('restriction-updated', handler);

    return () => {
      cancelled = true;
      window.removeEventListener('restriction-updated', handler);
    };
  }, [userId]);

  return data;
}

