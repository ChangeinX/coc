import { useEffect, useState } from 'react';
import { proxyImageUrl, fetchCachedIcon } from '../lib/assets.js';

export default function useCachedIcon(url) {
  const [src, setSrc] = useState(() => proxyImageUrl(url));

  useEffect(() => {
    if (!url) return;
    let ignore = false;
    let objectUrl;
    fetchCachedIcon(url)
      .then((blob) => {
        if (ignore || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {});
    return () => {
      ignore = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return src;
}
