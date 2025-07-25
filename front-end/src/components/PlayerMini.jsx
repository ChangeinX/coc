import React, { useEffect, useState } from 'react';
import { fetchJSONCached } from '../lib/api.js';
import CachedImage from './CachedImage.jsx';

export default function PlayerMini({ tag, player: preload }) {
  const [player, setPlayer] = useState(preload || null);

  useEffect(() => {
    if (preload) {
      setPlayer(preload);
      return;
    }
    let ignore = false;
    async function load() {
      const t = tag || preload?.tag;
      if (!t) return;
      try {
        const data = await fetchJSONCached(`/player/${encodeURIComponent(t)}`);
        if (!ignore) setPlayer(data);
      } catch {
        if (!ignore) setPlayer(null);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [tag, preload]);

  const displayTag = preload?.tag || tag;
  if (!displayTag) return null;
  if (!player) return <span>{displayTag}</span>;

  return (
    <span className="flex items-center gap-1">
      {player.leagueIcon && (
        <CachedImage src={player.leagueIcon} alt="league" className="w-4 h-4" />
      )}
      <span>{player.name}</span>
      <span className="text-xs text-slate-500">{player.tag}</span>
    </span>
  );
}
