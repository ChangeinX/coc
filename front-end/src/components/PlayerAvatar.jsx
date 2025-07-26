import React, { useEffect, useState } from 'react';
import { fetchJSONCached } from '../lib/api.js';
import CachedImage from './CachedImage.jsx';

export default function PlayerAvatar({ tag, player: preload = null, showName = true, className = '', ...props }) {
  const [player, setPlayer] = useState(preload);

  useEffect(() => {
    if (preload) return;
    if (!tag) return;
    let ignore = false;
    async function load() {
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
  }, [tag, preload]);

  const name = player?.name || tag;

  return (
    <div className={`flex flex-col items-center w-16 ${className}`} {...props}>
      {player?.leagueIcon ? (
        <CachedImage src={player.leagueIcon} alt="league" className="w-12 h-12 rounded-full" />
      ) : (
        <div className="w-12 h-12 rounded-full bg-slate-300 flex items-center justify-center text-lg font-semibold">
          {name ? name.charAt(0) : '?'}
        </div>
      )}
      {showName && <span className="text-xs mt-1 truncate w-12 text-center">{name}</span>}
    </div>
  );
}
