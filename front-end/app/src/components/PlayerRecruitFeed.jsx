import React, { useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import PlayerRecruitCard from './PlayerRecruitCard.jsx';
import PageChip from './PageChip.jsx';
import RecruitSkeleton from './RecruitSkeleton.jsx';

const ROW_HEIGHT = 112;

export default function PlayerRecruitFeed({ items, loadMore, hasMore, onInvite, initialPage = 1 }) {
  const parentRef = useRef(null);
  const withChips = [];
  items.forEach((item, i) => {
    if (i > 0 && i % 100 === 0) {
      withChips.push({ type: 'chip', page: i / 100 + 1 });
    }
    withChips.push({ type: 'card', data: item });
  });

  const count = hasMore ? withChips.length + 1 : withChips.length;

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
    initialOffset: (initialPage - 1) * ROW_HEIGHT * 100,
  });

  const itemsVirtual = virtualizer.getVirtualItems();

  useEffect(() => {
    const last = itemsVirtual[itemsVirtual.length - 1];
    if (last && last.index >= withChips.length - 5 && hasMore) {
      loadMore();
    }
  }, [itemsVirtual, hasMore]);

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div tabIndex="0" className="sr-only" aria-hidden="true" />
      <a href="#" className="block p-2 text-center text-sm">
        Load previous
      </a>
      <div
        style={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}
      >
        {itemsVirtual.map((virtual) => {
          const item = withChips[virtual.index];
          return (
            <div
              key={virtual.index}
              className="absolute top-0 left-0 w-full"
              style={{ transform: `translateY(${virtual.start}px)` }}
            >
              {!item && <RecruitSkeleton />}
              {item &&
                item.type === 'card' && (
                  <PlayerRecruitCard {...item.data} onInvite={() => onInvite?.(item.data)} />
                )}
              {item && item.type === 'chip' && <PageChip page={item.page} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
