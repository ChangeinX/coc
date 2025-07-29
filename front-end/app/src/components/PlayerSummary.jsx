import React, { useEffect, useState } from 'react';
import { fetchJSONCached } from '../lib/api.js';
import CachedImage from './CachedImage.jsx';
import { getTownHallIcon } from '../lib/townhall.js';
import Loading from './Loading.jsx';
import RiskRing from './RiskRing.jsx';
import DonationRing from './DonationRing.jsx';
import PresenceDot from './PresenceDot.jsx';
import LoyaltyBadge from './LoyaltyBadge.jsx';

export default function PlayerSummary({ tag, showHeader = true, scrollBadges = true }) {
  const [player, setPlayer] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchJSONCached(`/player/${encodeURIComponent(tag)}`);
        setPlayer(data);
      } catch (err) {
        setError(err.message);
      }
    };
    load();
  }, [tag]);

  if (!tag) return null;
  if (!player && !error) return <Loading className="py-8" />;
  if (error) return <p className="text-center text-red-600 py-8">{error}</p>;

  return (
    <>
      {showHeader && (
        <h3 className="text-lg font-semibold text-slate-800 flex flex-wrap items-center gap-2">
          {player.leagueIcon && (
            <CachedImage src={player.leagueIcon} alt="league" className="w-6 h-6" />
          )}
          <span>{player.name}</span>
          <span className="text-sm font-normal text-slate-500">{player.tag}</span>
        </h3>
      )}
      <div
        className={`flex gap-4 mt-4 justify-center ${
          scrollBadges ? 'flex-nowrap overflow-x-auto scroller' : 'flex-wrap'
        }`}
      >
        <div className="flex flex-col items-center w-12">
          <span className="w-8 h-8 flex items-center justify-center font-semibold">
            {getTownHallIcon(player.townHallLevel)}
          </span>
        </div>
        {player.labels?.map((l) => (
          <div className="flex flex-col items-center w-12" key={l.id || l.name}>
            <CachedImage
              src={l.iconUrls.small || l.iconUrls.medium}
              alt={l.name}
              className="w-8 h-8"
            />
            <p className="text-xs text-slate-500 mt-1">{l.name}</p>
          </div>
        ))}
        <div className="flex flex-col items-center w-12">
          <span className="text-2xl leading-none">🏆</span>
          <p className="text-xs text-slate-500 mt-1">{player.trophies}</p>
        </div>
      </div>
      <div className="mt-4">
        <p className="font-semibold mb-2">Member Health</p>
        <div className="flex justify-center gap-6">
          <div className="flex flex-col items-center">
            <RiskRing score={player.risk_score} size={64} />
            <p className="text-xs text-slate-500 mt-1">Risk</p>
          </div>
          <div className="flex flex-col items-center">
            <DonationRing
              donations={player.donations}
              received={player.donationsReceived}
              size={64}
            />
            <p className="text-xs text-slate-500 mt-1">Donations</p>
          </div>
          <div className="flex flex-col items-center">
            <PresenceDot lastSeen={player.last_seen} size={64} />
            <p className="text-xs text-slate-500 mt-1">Seen</p>
          </div>
          <div className="flex flex-col items-center">
            <LoyaltyBadge days={player.loyalty} size={64} />
            <p className="text-xs text-slate-500 mt-1">In Clan</p>
          </div>
        </div>
      </div>
      {player.risk_breakdown && player.risk_breakdown.length > 0 && (
        <div className="mt-4">
          <ul className="list-disc list-inside text-sm">
            {player.risk_breakdown.map((r, i) => (
              <li key={i}>
                {r.points} pts&nbsp;– {r.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
