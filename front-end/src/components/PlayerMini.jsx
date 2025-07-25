import React, { useEffect, useState } from 'react';
import { fetchJSONCached } from '../lib/api.js';
import CachedImage from './CachedImage.jsx';

export default function PlayerMini({ tag }) {
  const [player, setPlayer] = useState(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!tag) return;
      try {
        const data = await fetchJSONCached(`/player/${encodeURIComponent(tag)}`);
        if (!ignore) setPlayer(data);
      } catch {
        if (!ignore) setPlayer(null);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [tag]);

  if (!tag) return null;
  if (!player) return <span>#{tag}</span>;

  return (
    <span className="flex items-center gap-1">
      {player.leagueIcon && (
        <CachedImage src={player.leagueIcon} alt="league" className="w-4 h-4" />
      )}
      <span>{player.name}</span>
      <span className="text-xs text-slate-500">#{player.tag}</span>
    </span>
  );
}
