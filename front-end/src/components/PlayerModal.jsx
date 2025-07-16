import React, { useEffect, useState } from 'react';
import { fetchJSONCached } from '../lib/api.js';

import Loading from './Loading.jsx';
import RiskRing from './RiskRing.jsx';
import DonationRing from './DonationRing.jsx';
import PresenceDot from './PresenceDot.jsx';

export default function PlayerModal({ tag, onClose }) {
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
        <div className="bg-white w-full max-w-lg rounded-xl shadow-xl p-6 relative">
          <button className="absolute top-3 right-3 text-slate-400" onClick={onClose}>✕</button>
          {!player && !error && <p className="text-center py-8">Loading…</p>}
          {!player && !error && <Loading className="py-8" />}
          {error && <p className="text-center text-red-600 py-8">{error}</p>}
          {player && (
            <>
              <h3 className="text-xl font-semibold text-slate-800 flex flex-wrap items-center gap-2">
                {player.leagueIcon && (
                  <img src={player.leagueIcon} alt="league" className="w-6 h-6" />
                )}
                <span>{player.name}</span>
                <span className="text-sm font-normal text-slate-500">{player.tag}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-sm text-slate-500">Town Hall</p>
                  <p className="text-xl font-semibold">{player.townHallLevel}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Trophies</p>
                  <p className="text-xl font-semibold">{player.trophies}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Donations</p>
                  <p className="text-xl font-semibold">{player.donations}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Received</p>
                  <p className="text-xl font-semibold">{player.donationsReceived}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Days in Clan</p>
                  <p className="text-xl font-semibold">{player.loyalty}</p>
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
