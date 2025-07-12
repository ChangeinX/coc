import React, { useEffect, useState } from 'react';
import { fetchJSON } from './api.js';

export default function PlayerModal({ tag, onClose }) {
  const [player, setPlayer] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchJSON(`/player/${encodeURIComponent(tag)}`);
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
          {error && <p className="text-center text-red-600 py-8">{error}</p>}
          {player && (
            <>
              <h3 className="text-xl font-semibold text-slate-800 flex flex-wrap items-center gap-2">
                <span>{player.name}</span>
                <span className="text-sm font-normal text-slate-500">{player.tag}</span>
              </h3>
              <div className="grid grid-cols-2 gap-4 mt-4">
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
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
