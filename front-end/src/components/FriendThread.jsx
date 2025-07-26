import React, { useRef, useState } from 'react';
import PlayerAvatar from './PlayerAvatar.jsx';
import PlayerMini from './PlayerMini.jsx';
import { shortTimeAgo } from '../lib/time.js';

export default function FriendThread({ friend, pending, onSelect, onRemove }) {
  const longPress = useRef(false);
  const timer = useRef(null);
  const startX = useRef(0);
  const [swiped, setSwiped] = useState(false);

  function handlePointerDown(e) {
    startX.current = e.clientX;
    longPress.current = false;
    timer.current = setTimeout(() => {
      longPress.current = true;
      if (onRemove) onRemove(friend);
    }, 600);
  }

  function handlePointerMove(e) {
    if (Math.abs(e.clientX - startX.current) > 30) {
      clearTimeout(timer.current);
      if (e.clientX < startX.current - 30) {
        setSwiped(true);
      }
    }
  }

  function handlePointerUp() {
    clearTimeout(timer.current);
    if (!longPress.current && !swiped) {
      onSelect(friend);
    }
    if (swiped) {
      setTimeout(() => setSwiped(false), 2000);
    }
  }

  return (
    <li
      className={`thread ${swiped ? 'swiped' : ''}`}
      aria-label={pending ? 'Unread' : undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => clearTimeout(timer.current)}
    >
      <div className="avatar">
        <PlayerAvatar tag={friend.playerTag} showName={false} className="w-12" />
      </div>
      <div className="meta">
        <div className="name">
          <PlayerMini tag={friend.playerTag} showTag={false} />
        </div>
        <div className="preview">Tap to chat…</div>
      </div>
      <time className="time">
        {friend.lastSeen ? shortTimeAgo(friend.lastSeen) : ''}
      </time>
      <div className="thread-actions">
        <button
          className="text-sm focus:outline-none"
          onClick={() => onRemove(friend.playerTag)}
        >
          Remove
        </button>
      </div>
    </li>
  );
}
