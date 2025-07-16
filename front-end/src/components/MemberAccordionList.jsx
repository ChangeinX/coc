import React, { useRef } from 'react';
import { VariableSizeList as List } from 'react-window';
import RiskRing from './RiskRing.jsx';
import Loading from './Loading.jsx';
import DonationRing from './DonationRing.jsx';
import { timeAgo } from '../lib/time.js';
import { getTownHallIcon } from '../lib/townhall.js';
import { proxyImageUrl } from '../lib/assets.js';

function Row({ index, style, data }) {
  const { members, openIndex, setOpenIndex, getSize, listRef, refreshing } = data;
  const m = members[index];
  const open = openIndex === index;
  const toggle = () => {
    const prev = openIndex;
    const next = open ? null : index;
    setOpenIndex(next);
    if (listRef.current) {
      const start = Math.min(index, prev ?? index);
      listRef.current.resetAfterIndex(start);
      if (next !== null) {
        requestAnimationFrame(() => listRef.current?.scrollToItem(next));
      }
    }
  };
  return (
    <div style={{ ...style, overflow: 'hidden' }} className="border-b px-3" onClick={toggle}>
      <div className="flex justify-between items-center py-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            {m.leagueIcon && (
              <img src={proxyImageUrl(m.leagueIcon)} alt="league" className="w-5 h-5" />
            )}
            <img
              src={getTownHallIcon(m.townHallLevel)}
              alt={`TH${m.townHallLevel}`}
              className="w-5 h-5"
            />
            <span className="font-medium">{m.name}</span>
            {m.role && (
              <span className="text-xs bg-slate-200 rounded px-1">{m.role}</span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {m.last_seen ? timeAgo(m.last_seen) : '\u2014'}
          </p>
        </div>
        {!open && (refreshing ? (
          <Loading size={32} />
        ) : (
          <RiskRing score={m.risk_score} size={32} />
        ))}
      </div>
      {open && (
        <div className="text-sm space-y-1 pb-2">
          <div className="flex justify-between">
            <span>Trophies: {m.trophies}</span>
            <span>Last Seen: {m.last_seen ? timeAgo(m.last_seen) : '—'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Don/Rec: {m.donations}/{m.donationsReceived}</span>
            <DonationRing donations={m.donations} received={m.donationsReceived} size={32} />
          </div>
          <div className="flex justify-between items-center">
            <span>Days in Clan: {m.loyalty}</span>
            {refreshing ? (
              <Loading size={32} />
            ) : (
              <RiskRing score={m.risk_score} size={32} />
            )}
          </div>
          {m.risk_breakdown && m.risk_breakdown.length > 0 && (
            <ul className="list-disc list-inside text-xs pt-1">
              {m.risk_breakdown.map((r, i) => (
                <li key={i}>
                  {r.points} pts – {r.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function MemberAccordionList({ members, height, refreshing = false }) {
  const listRef = useRef();
  const [openIndex, setOpenIndex] = React.useState(null);
  const getSize = (index) => {
    const m = members[index];
    const base = 56;
    if (openIndex !== index) return base;
    const lines = (m.risk_breakdown?.length || 0) + 3; // three base rows
    return base + 24 + lines * 20;
  };

  return (
    <List
      height={height}
      itemCount={members.length}
      itemSize={getSize}
      width="100%"
      itemData={{ members, openIndex, setOpenIndex, getSize, listRef, refreshing }}
      ref={listRef}
    >
      {Row}
    </List>
  );
}
