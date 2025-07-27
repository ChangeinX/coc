import React, { useRef } from 'react';
import PlayerAvatar from './PlayerAvatar.jsx';
import PlayerMini from './PlayerMini.jsx';

function formatTs(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (err) {
    console.error('Failed to format timestamp', err);
    return '';
  }
}

export default function FriendThread({
  friend,
  pending,
  onSelect,
  onRemove,
  preview,
  ts,
}) {
  const longPress = useRef(false);
  const timer = useRef(null);

  function handlePointerDown(e) {
    longPress.current = false;
    timer.current = setTimeout(() => {
      longPress.current = true;
      if (onRemove) onRemove(friend.playerTag);
    }, 600);
    e.preventDefault();
  }

  function handlePointerUp() {
    clearTimeout(timer.current);
    if (!longPress.current) {
      onSelect(friend);
    }
  }

  return (
    <li
      className="thread select-none"
      aria-label={pending ? 'Unread' : undefined}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => clearTimeout(timer.current)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="avatar">
        <PlayerAvatar
          tag={friend.playerTag}
          showName={false}
          className="w-8 h-8"
        />
      </div>
      <div className="meta">
        <div className="name">
          <PlayerMini tag={friend.playerTag} showTag={false} showLeague={false} />
        </div>
        <div className="preview">{preview || 'Tap to chat…'}</div>
      </div>
      <time className="time" dateTime={ts || ''}>{formatTs(ts)}</time>
    </li>
  );
}
