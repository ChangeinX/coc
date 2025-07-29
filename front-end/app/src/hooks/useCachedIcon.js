import { useEffect, useState } from 'react';
import { proxyImageUrl, fetchCachedIcon } from '../lib/assets.js';

export default function useCachedIcon(url, strategy = 'indexed') {
  const [src, setSrc] = useState('');

  useEffect(() => {
    if (!url) return;
    let ignore = false;
    let objectUrl;
    fetchCachedIcon(url, strategy)
      .then((blob) => {
        if (!blob) return;
        if (!ignore) {
          objectUrl = URL.createObjectURL(blob);
          setSrc(objectUrl);
        }
      })
      .catch(() => {
        if (!ignore) setSrc(proxyImageUrl(url));
      });
    return () => {
      ignore = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, strategy]);

  return src;
}
