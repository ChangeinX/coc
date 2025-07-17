import { useEffect, useState } from 'react';
import { fetchJSON } from '../lib/api.js';

export default function useFeatures(token) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!token) {
      setData(null);
      return;
    }
    let cancelled = false;
    const load = () => {
      fetchJSON('/user/features')
        .then((res) => {
          if (!cancelled) setData(res);
        })
        .catch(() => {
          if (!cancelled) setData(null);
        });
    };
    load();
    const handler = () => {
      if (!cancelled) load();
    };
    window.addEventListener('features-updated', handler);
    return () => {
      cancelled = true;
      window.removeEventListener('features-updated', handler);
    };
  }, [token]);

  function enabled(name) {
    if (!data) return false;
    if (data.all) return true;
    return data.features.includes(name);
  }

  return { enabled, data };
}
