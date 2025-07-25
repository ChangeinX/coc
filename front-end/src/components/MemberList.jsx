import React from 'react';
import { FixedSizeList as List } from 'react-window';
import RiskRing from './RiskRing.jsx';
import DonationRing from './DonationRing.jsx';
import { timeAgo } from '../lib/time.js';
import { getTownHallIcon } from '../lib/townhall.js';
import PlayerMini from './PlayerMini.jsx';

function Row({ index, style, data }) {
  const { members, onSelect, refreshing } = data;
  const m = members[index];
  return (
    <div
      style={style}
      className="flex justify-between items-center border-b px-3 py-2 cursor-pointer"
      onClick={() => onSelect(m.tag)}
    >
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <img
            src={getTownHallIcon(m.townHallLevel)}
            alt={`TH${m.townHallLevel}`}
            className="w-5 h-5"
          />
          <span className="font-medium">
            <PlayerMini player={m} />
          </span>
        </div>
        <span className="text-xs text-slate-500">
          {m.last_seen ? timeAgo(m.last_seen) : '\u2014'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <RiskRing score={m.risk_score} size={32} />
        <div className="hidden md:block">
          <DonationRing
            donations={m.donations}
            received={m.donationsReceived}
            size={32}
          />
        </div>
        {refreshing && <span className="animate-pulse">⟳</span>}
      </div>
    </div>
  );
}

export default function MemberList({ members, height, onSelect, refreshing }) {
  return (
    <List
      height={height}
      itemCount={members.length}
      itemSize={56}
      width="100%"
      itemData={{ members, onSelect, refreshing }}
    >
      {Row}
    </List>
  );
}
