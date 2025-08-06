import React, { useRef, useEffect } from 'react';
import RecruitCard from './RecruitCard.jsx';
import PageChip from './PageChip.jsx';
import RecruitSkeleton from './RecruitSkeleton.jsx';

export default function RecruitFeed({ items, loadMore, hasMore, onJoin, onSelect }) {
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
      <RecruitCard
        key={item.id}
        clanTag={item.data.clanTag}
        deepLink={item.data.deepLink}
        name={item.data.name}
        labels={item.data.labels}
        language={item.data.language}
        memberCount={item.data.memberCount}
        warLeague={item.data.warLeague}
        clanLevel={item.data.clanLevel}
        requiredTrophies={item.data.requiredTrophies}
        requiredBuilderBaseTrophies={item.data.requiredBuilderBaseTrophies}
        requiredTownhallLevel={item.data.requiredTownhallLevel}
        callToAction={item.data.callToAction}
        createdAt={item.createdAt || item.created_at}
        onJoin={() => onJoin?.(item.data)}
        onClick={() => onSelect?.(item.data)}
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
