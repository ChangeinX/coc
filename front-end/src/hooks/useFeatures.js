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
    fetchJSON('/user/features')
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  function enabled(name) {
    if (!data) return false;
    if (data.all) return true;
    return data.features.includes(name);
  }

  return { enabled, data };
}
