import React, { useRef, useEffect } from 'react';
import PlayerRecruitCard from './PlayerRecruitCard.jsx';
import PageChip from './PageChip.jsx';
import RecruitSkeleton from './RecruitSkeleton.jsx';

export default function PlayerRecruitFeed({ items, loadMore, hasMore, onInvite }) {
  const parentRef = useRef(null);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    function onScroll() {
      if (hasMore && el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
        loadMore();
      }
    }
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [hasMore, loadMore]);

  const list = [];
  items.forEach((item, i) => {
    if (i > 0 && i % 100 === 0) {
      list.push(<PageChip key={`chip-${i}`} page={i / 100 + 1} />);
    }
    list.push(
      <PlayerRecruitCard
        key={item.id || i}
        {...item}
        onInvite={() => onInvite?.(item)}
      />
    );
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div tabIndex="0" className="sr-only" aria-hidden="true" />
      <a href="#" className="block p-2 text-center text-sm">
        Load previous
      </a>
      <div className="flex flex-col gap-2 p-2">
        {list}
        {hasMore && <RecruitSkeleton />}
      </div>
    </div>
  );
}
