import React from 'react';
import RiskRing from './RiskRing.jsx';
import DonationRing from './DonationRing.jsx';
import { timeAgo } from '../lib/time.js';

export default function ProfileCard({ member, onClick }) {
  if (!member) return null;
  return (
    <div
      className="bg-white rounded shadow ring-2 ring-rose-200 px-4 py-3 flex flex-col items-center text-sm cursor-pointer w-40 shrink-0"
      onClick={onClick}
    >
      {member.leagueIcon && (
        <img src={member.leagueIcon} alt="league" className="w-6 h-6 mb-1" />
      )}
      <p className="font-medium text-center mb-1">{member.name}</p>
      <RiskRing score={member.risk_score} size={48} />
      <div className="mt-2 text-center space-y-1 w-full">
        <p>TH{member.townHallLevel}</p>
        <p className="flex justify-between">
          <span>{member.donations}/{member.donationsReceived}</span>
          <DonationRing
            donations={member.donations}
            received={member.donationsReceived}
            size={32}
          />
        </p>
        <p className="text-xs text-slate-500">
          {member.last_seen ? timeAgo(member.last_seen) : '\u2014'}
        </p>
      </div>
    </div>
  );
}
