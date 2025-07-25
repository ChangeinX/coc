import React from 'react';
import RiskRing from './RiskRing.jsx';
import Loading from './Loading.jsx';
import { timeAgo } from '../lib/time.js';
import { getTownHallIcon } from '../lib/townhall.js';
import PlayerMini from './PlayerMini.jsx';

export default function ProfileCard({ member, onClick, refreshing = false }) {
  if (!member) return null;
  return (
    <div
      className="relative bg-white rounded shadow ring-2 ring-rose-200 px-4 py-3 flex flex-col items-center text-sm cursor-pointer w-40 shrink-0"
      onClick={onClick}
    >
      {refreshing && (
        <div className="absolute top-2 right-2">
          <Loading size={16} />
        </div>
      )}
      <div className="flex gap-1 items-center mb-1">
        <PlayerMini player={member} />
        <img
          src={getTownHallIcon(member.townHallLevel)}
          alt={`TH${member.townHallLevel}`}
          className="w-6 h-6"
        />
      </div>
      <RiskRing score={member.risk_score} size={48} />
      <div className="mt-2 text-center space-y-1 w-full">
        <p>TH{member.townHallLevel}</p>
        <p className="text-xs text-slate-500">
          {member.last_seen ? timeAgo(member.last_seen) : '\u2014'}
        </p>
      </div>
    </div>
  );
}
