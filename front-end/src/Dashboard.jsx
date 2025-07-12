import React, { useState, useEffect } from 'react';
import PlayerModal from './PlayerModal.jsx';
import { fetchJSON } from './api.js';

const DEFAULT_TAG = 'UV0YR2Q8';

export default function Dashboard() {
  const [tag, setTag] = useState('');
  const [clan, setClan] = useState(null);
  const [topRisk, setTopRisk] = useState([]);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  const load = async (clanTag) => {
    try {
      const clanData = await fetchJSON(`/clan/${encodeURIComponent(clanTag)}`);
      const riskData = await fetchJSON(
        `/clan/${encodeURIComponent(clanTag)}/members/at-risk`
      );
      const loyaltyMap = await fetchJSON(
        `/clan/${encodeURIComponent(clanTag)}/members/loyalty`
      );
      const rmap = Object.fromEntries(riskData.map((r) => [r.player_tag, r]));
      const merged = clanData.memberList.map((m) => ({
        ...m,

        risk_score: rmap[m.tag.replace('#', '')]?.risk_score || 0,
        last_seen: rmap[m.tag.replace('#', '')]?.last_seen || null,
        loyalty: loyaltyMap[m.tag.replace('#', '')] || 0,
      }));
      setClan(clanData);
      setTopRisk([...merged].sort((a,b) => b.risk_score - a.risk_score).slice(0,10));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load(DEFAULT_TAG);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const clanTag = tag.trim().toUpperCase();
    if (clanTag) load(clanTag);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <form onSubmit={handleSubmit} className="flex gap-2 justify-center">
        <input
          className="max-w-xs px-3 py-2 rounded border"
          placeholder="Clan tag (without #)"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        />
        <button type="submit" className="px-4 py-2 rounded bg-slate-800 text-white">
          Load
        </button>
      </form>
      {error && <p className="text-center text-red-600 font-medium">{error}</p>}
      {clan && (
        <>
          <h2 className="text-xl font-semibold text-slate-700">At-Risk Members</h2>
          <div className="overflow-x-auto shadow bg-white rounded mb-6">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3">Tag</th>
                  <th className="px-4 py-3">Last Seen</th>
                  <th className="px-4 py-3">Loyalty</th>
                  <th className="px-4 py-3">Score</th>
                </tr>
              </thead>
              <tbody>
                {topRisk.map((m) => (
                  <tr
                    key={m.tag}
                    className="border-b last:border-none hover:bg-rose-50 cursor-pointer"
                    onClick={() => setSelected(m.tag)}
                  >
                    <td className="px-4 py-2 font-medium">{m.name}</td>
                    <td className="px-4 py-2 text-slate-500">{m.tag}</td>
                    <td className="px-4 py-2">{m.last_seen || '\u2014'}</td>
                    <td className="px-4 py-2 text-center">{m.loyalty}</td>
                    <td className="px-4 py-2">{m.risk_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {selected && <PlayerModal tag={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
