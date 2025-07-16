import React, { useEffect, useState } from 'react';
import { fetchJSONCached } from '../lib/api.js';
import { proxyImageUrl } from '../lib/assets.js';
import { getTownHallIcon } from '../lib/townhall.js';

import Loading from './Loading.jsx';
import RiskRing from './RiskRing.jsx';
import DonationRing from './DonationRing.jsx';
import PresenceDot from './PresenceDot.jsx';
import LoyaltyBadge from './LoyaltyBadge.jsx';

export default function PlayerModal({ tag, onClose, refreshing = false }) {
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

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose}></div>
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6 relative">
          <button className="absolute top-3 right-3 text-slate-400" onClick={onClose}>✕</button>
          {!player && !error && <p className="text-center py-8">Loading…</p>}
          {!player && !error && <Loading className="py-8" />}
          {error && <p className="text-center text-red-600 py-8">{error}</p>}
          {player && (
            <>
              <h3 className="text-xl font-semibold text-slate-800 flex flex-wrap items-center gap-2">
                {player.leagueIcon && (
                  <img src={proxyImageUrl(player.leagueIcon)} alt="league" className="w-6 h-6" />
                )}
                <span>{player.name}</span>
                <span className="text-sm font-normal text-slate-500">{player.tag}</span>
              </h3>
              {/* Keep badges from wrapping onto a second row (#120) */}
              <div className="flex flex-nowrap overflow-x-auto gap-4 mt-4 justify-center scroller">
                <div className="flex flex-col items-center w-16">
                  <img
                    src={getTownHallIcon(player.townHallLevel)}
                    alt={`TH${player.townHallLevel}`}
                    className="w-8 h-8"
                  />
                  <p className="text-xs text-slate-500 mt-1">TH{player.townHallLevel}</p>
                </div>
                {player.labels?.map((l) => (
                  <div className="flex flex-col items-center w-16" key={l.id || l.name}>
                    <img
                      src={proxyImageUrl(l.iconUrls.small || l.iconUrls.medium)}
                      alt={l.name}
                      className="w-8 h-8"
                    />
                    <p className="text-xs text-slate-500 mt-1">{l.name}</p>
                  </div>
                ))}
                <div className="flex flex-col items-center w-16">
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
                    <ul className="list-disc list-inside text-sm mt-1">
                      {player.risk_breakdown.map((r, i) => (
                        <li key={i}>
                          {r.points} pts – {r.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
