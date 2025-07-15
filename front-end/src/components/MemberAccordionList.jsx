import React, { useRef } from 'react';
import { VariableSizeList as List } from 'react-window';
import RiskBadge, { getRiskClasses } from './RiskBadge.jsx';

function RiskDot({ score }) {
  const cls = getRiskClasses(score).split(' ')[0];
  return <span className={`inline-block w-3 h-3 rounded-full ${cls}`}></span>;
}

function Row({ index, style, data }) {
  const { members, openIndex, setOpenIndex, getSize, listRef } = data;
  const m = members[index];
  const open = openIndex === index;
  const toggle = () => {
    setOpenIndex(open ? null : index);
    listRef.current.resetAfterIndex(index);
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
        <RiskDot score={m.risk_score} />
      </div>
      {open && (
        <div className="text-sm space-y-1 pb-2">
          <div className="flex justify-between">
            <span>Trophies: {m.trophies}</span>
            <span>Last: {m.last_seen || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span>Loyalty: {m.loyalty}</span>
            <span>Risk: <RiskBadge score={m.risk_score} /></span>
          </div>
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
