import React, { useEffect, useMemo, useRef } from 'react';
import RecruitCard from './RecruitCard.jsx';
import PageChip from './PageChip.jsx';
import RecruitSkeleton from './RecruitSkeleton.jsx';

export default function RecruitFeed({
  items,
  loadMore,
  hasMore,
  onJoin,
  onSelect,
}) {
  const parentRef = useRef(null);

  const withChips = useMemo(() => {
    const data = [];
    items.forEach((item, i) => {
      if (i > 0 && i % 100 === 0) {
        data.push({ type: 'chip', page: i / 100 + 1 });
      }
      data.push({ type: 'card', data: { ...item.data, id: item.id } });
    });
    return data;
  }, [items]);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    function onScroll() {
      if (hasMore && el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
        loadMore();
      }
    }
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [hasMore, loadMore]);

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div tabIndex="0" className="sr-only" aria-hidden="true" />
      <a href="#" className="block p-2 text-center text-sm">
        Load previous
      </a>
      <div className="flex flex-col gap-2">
        {withChips.map((item) => (
          <div
            key={item.type === 'chip' ? `chip-${item.page}` : item.data.id}
            className="p-2"
          >
            {item.type === 'card' ? (
              <RecruitCard
                clanTag={item.data.clanTag}
                deepLink={item.data.deepLink}
                name={item.data.name}
                labels={item.data.labels}
                language={item.data.language}
                memberCount={item.data.memberCount}
                warLeague={item.data.warLeague}
                clanLevel={item.data.clanLevel}
                requiredTrophies={item.data.requiredTrophies}
                requiredTownhallLevel={item.data.requiredTownhallLevel}
                onJoin={() => onJoin?.(item.data)}
                onClick={() => onSelect?.(item.data)}
              />
            ) : (
              <PageChip page={item.page} />
            )}
          </div>
        ))}
        {hasMore && (
          <div className="p-2">
            <RecruitSkeleton />
          </div>
        )}
      </div>
    </div>
  );
}

