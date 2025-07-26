import React, { useEffect, useState } from 'react';
import { fetchJSONCached } from '../lib/api.js';
import CachedImage from './CachedImage.jsx';

export default function PlayerMini({
  tag,
  player: preload,
  showTag = true,
  showLeague = true,
}) {
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
  if (!tag && !preload) return null;
  if (!player) return showTag && displayTag ? <span>{displayTag}</span> : null;

  return (
    <span className="flex items-center gap-1">
      {showLeague && player.leagueIcon && (
        <CachedImage
          key={player.tag}
          src={player.leagueIcon}
          alt="league"
          className="w-4 h-4"
        />
      )}
      <span>{player.name}</span>
      {showTag && player.tag && (
        <span className="text-xs text-slate-500">{player.tag}</span>
      )}
    </span>
  );
}
