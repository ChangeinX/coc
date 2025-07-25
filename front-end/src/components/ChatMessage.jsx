import React, { useRef } from 'react';
import PlayerMini from './PlayerMini.jsx';

export default function ChatMessage({ message, info, isSelf }) {
  const { content } = message;
  const senderTag = message.senderId?.startsWith('#')
    ? message.senderId
    : message.userId?.startsWith('#')
    ? message.userId
    : info?.tag || null;
  const timer = useRef(null);

  function triggerAddFriend() {
    if (senderTag) {
      window.dispatchEvent(new CustomEvent('open-friend-add', { detail: senderTag }));
    }
  }

  function handlePointerDown(e) {
    if (e.pointerType === 'touch') {
      timer.current = setTimeout(triggerAddFriend, 600);
    } else if (e.pointerType === 'mouse' && e.button === 2) {
      e.preventDefault();
      triggerAddFriend();
    }
  }

  function clearTimer() {
    clearTimeout(timer.current);
  }

  return (
    <div
      style={{ touchAction: 'pan-y' }}
      className={`flex ${isSelf ? 'justify-end' : 'justify-start'} select-none`}
      onPointerDown={handlePointerDown}
      onPointerUp={clearTimer}
      onPointerCancel={clearTimer}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className={`max-w-[80%] rounded px-2 py-1 select-none ${isSelf ? 'bg-blue-100' : 'bg-slate-100'}`}
      >
        {content}
        {info && (
          <div className="mt-1 text-xs text-slate-500">
            <PlayerMini
              player={{ name: info.name, tag: senderTag, leagueIcon: info.icon }}
              showTag={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
