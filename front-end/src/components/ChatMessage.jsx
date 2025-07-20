import React, { useEffect, useState } from 'react';
import { fetchJSONCached } from '../lib/api.js';
import { proxyImageUrl } from '../lib/assets.js';

export default function ChatMessage({ message }) {
  const { userId: playerTag, content } = message;
  const [info, setInfo] = useState(null);

  useEffect(() => {
    let ignore = false;
    if (!playerTag) return;
    fetchJSONCached(`/player/${encodeURIComponent(playerTag)}`)
      .then((data) => {
        if (!ignore) {
          setInfo({ name: data.name, icon: data.leagueIcon });
        }
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [playerTag]);

  return (
    <div className="bg-slate-100 rounded px-2 py-1">
      {content}
      {info && (
        <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
          {info.icon && (
            <img
              src={proxyImageUrl(info.icon)}
              alt="league"
              className="w-4 h-4"
            />
          )}
          <span>{info.name}</span>
        </div>
      )}
    </div>
  );
}
