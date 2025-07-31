import { useEffect, useState } from 'react';
import { fetchJSON } from '../lib/api.js';

export default function useRestrictions(userId) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let ignore = false;
    (async () => {
      try {
        const res = await fetchJSON(`/chat/restrictions/${encodeURIComponent(userId)}`);
        if (!ignore) setData(res);
      } catch (err) {
        console.error('Failed to fetch restrictions', err);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [userId]);

  return data;
}

