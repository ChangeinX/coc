import React, { useState, useEffect, useRef } from 'react';
import PlayerMini from './PlayerMini.jsx';
import PlayerAvatar from './PlayerAvatar.jsx';

export default function FriendThread({ friend, pending, onOpen, onRemove }) {
  const longPress = useRef(false);
  const timer = useRef(null);
  const startX = useRef(0);
  const [offset, setOffset] = useState(0);
  const ref = useRef(null);

  function handlePointerDown(e) {
    ref.current?.classList.add('active');
    if (e.pointerType !== 'mouse') {
      longPress.current = false;
      timer.current = setTimeout(() => {
        longPress.current = true;
        onRemove && onRemove(friend);
      }, 600);
    } else if (e.button === 2) {
      e.preventDefault();
      longPress.current = true;
      onRemove && onRemove(friend);
    }
    startX.current = e.clientX;
  }

  function handlePointerUp() {
    clearTimeout(timer.current);
    ref.current?.classList.remove('active');
    if (Math.abs(offset) > 40) {
      setOffset(offset < -40 ? -88 : 0);
      return;
    }
    if (!longPress.current) {
      onOpen && onOpen(friend);
    }
    setOffset(0);
  }

  function handleCancel() {
    clearTimeout(timer.current);
    ref.current?.classList.remove('active');
  }

  function handlePointerMove(e) {
    if (!startX.current) return;
    const dx = e.clientX - startX.current;
    if (dx < 0) setOffset(Math.max(-88, dx));
  }

  function handleKeyDown(e) {
    if (e.key === 'Delete') {
      onRemove && onRemove(friend);
    }
  }

  return (
    <li
      ref={ref}
      className={`thread-wrapper select-none ${offset ? 'swiping' : ''}`}
      role="button"
      tabIndex="0"
      aria-label={`Chat with ${friend.playerTag}`}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handleCancel}
      onContextMenu={(e) => {
        e.preventDefault();
        onRemove && onRemove(friend);
      }}
    >
      <div className="thread" style={{ transform: `translateX(${offset}px)` }}>
        <div className="avatar">
          <PlayerAvatar tag={friend.playerTag} showName={false} />
        </div>
        <div className="meta">
          <PlayerMini tag={friend.playerTag} showTag={false} />
          {pending && <span className="preview">\u23F3 Pending</span>}
        </div>
        <div className="time" aria-hidden="true">
          {''}
        </div>
      </div>
      <div className="thread-actions">
        <button onClick={() => onRemove && onRemove(friend)}>Remove</button>
      </div>
    </li>
  );
}
