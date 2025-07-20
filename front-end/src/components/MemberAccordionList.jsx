import React, { useRef, useLayoutEffect } from 'react';
import { VariableSizeList as List } from 'react-window';
import RiskRing from './RiskRing.jsx';
import Loading from './Loading.jsx';
import DonationRing from './DonationRing.jsx';
import PlayerSummary from './PlayerSummary.jsx';
import { timeAgo } from '../lib/time.js';
import { getTownHallIcon } from '../lib/townhall.js';
import CachedImage from './CachedImage.jsx';

function Row({ index, style, data }) {
  const { members, openIndex, setOpenIndex, listRef, refreshing, setSize } = data;
  const m = members[index];
  const open = openIndex === index;
  const rowRef = useRef(null);
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
  useLayoutEffect(() => {
    if (!rowRef.current) return;
    const el = rowRef.current;
    const update = () => {
      setSize(index, el.scrollHeight);
      listRef.current?.scrollToItem(index);
    };
    update();
    let cleanup = null;
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(update);
      observer.observe(el);
      cleanup = () => observer.disconnect();
    } else {
      const id = setInterval(update, 100);
      cleanup = () => clearInterval(id);
    }
    return cleanup;
  }, [open, index, setSize]);

  return (
    <div
      ref={rowRef}
      style={{
        ...style,
        overflow: open ? 'visible' : 'hidden',
        zIndex: open ? 1 : "auto",
      }}
      className="relative border-b px-3"
      onClick={toggle}
    >
      <div className="flex justify-between items-center py-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            {m.leagueIcon && (
              <CachedImage src={m.leagueIcon} alt="league" className="w-5 h-5" />
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
        {!open && <RiskRing score={m.risk_score} size={32} />}
        {refreshing && (
          <div className="absolute top-2 right-3">
            <Loading size={16} />
          </div>
        )}
      </div>
      {open && (
        <div className="pb-2">
          <PlayerSummary tag={m.tag} showHeader={false} scrollBadges={false} />
        </div>
      )}
    </div>
  );
}

export default function MemberAccordionList({ members, height, refreshing = false }) {
  const listRef = useRef();
  const [openIndex, setOpenIndex] = React.useState(null);
  const [sizes, setSizes] = React.useState(() => members.map(() => 56));

  const setSize = React.useCallback((idx, size) => {
    setSizes((s) => {
      if (s[idx] === size) return s;
      const next = [...s];
      next[idx] = size;
      listRef.current?.resetAfterIndex(idx);
      return next;
    });
  }, []);

  const getSize = React.useCallback((index) => sizes[index] || 56, [sizes]);

  React.useEffect(() => {
    setSizes(members.map(() => 56));
    setOpenIndex(null);
  }, [members]);

  return (
    <List
      height={height}
      itemCount={members.length}
      itemSize={getSize}
      width="100%"
      itemData={{ members, openIndex, setOpenIndex, listRef, refreshing, setSize }}
      ref={listRef}
    >
      {Row}
    </List>
  );
}
