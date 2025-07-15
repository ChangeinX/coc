import React, { useRef } from 'react';
import { VariableSizeList as List } from 'react-window';
import RiskRing from './RiskRing.jsx';
import DonationRing from './DonationRing.jsx';
import { timeAgo } from '../lib/time.js';

function Row({ index, style, data }) {
  const { members, openIndex, setOpenIndex, getSize, listRef } = data;
  const m = members[index];
  const open = openIndex === index;
  const toggle = () => {
    const prev = openIndex;
    setOpenIndex(open ? null : index);
    if (listRef.current) {
      const start = Math.min(index, prev ?? index);
      listRef.current.resetAfterIndex(start);
    }
  };
  return (
    <div style={style} className="border-b px-3" onClick={toggle}>
      <div className="flex justify-between items-center py-2">
        <div className="flex items-center gap-2">
          {m.leagueIcon && <img src={m.leagueIcon} alt="league" className="w-5 h-5" />}
          <span className="font-medium">{m.name}</span>
          {m.role && (
            <span className="text-xs bg-slate-200 rounded px-1">{m.role}</span>
          )}
          <span className="text-xs bg-slate-200 rounded px-1">TH{m.townHallLevel}</span>
        </div>
        <RiskRing score={m.risk_score} size={32} />
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
            <RiskRing score={m.risk_score} size={32} />
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

export default function MemberAccordionList({ members, height }) {
  const listRef = useRef();
  const [openIndex, setOpenIndex] = React.useState(null);
  const getSize = (index) => (openIndex === index ? 120 : 56);

  return (
    <List
      height={height}
      itemCount={members.length}
      itemSize={getSize}
      width="100%"
      itemData={{ members, openIndex, setOpenIndex, getSize, listRef }}
      ref={listRef}
    >
      {Row}
    </List>
  );
}
