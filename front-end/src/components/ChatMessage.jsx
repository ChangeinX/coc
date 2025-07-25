import React, { useRef } from 'react';
import PlayerMini from './PlayerMini.jsx';

export default function ChatMessage({ message, info, isSelf }) {
  const { content } = message;
  const senderTag = message.senderId?.startsWith('#')
    ? message.senderId
    : message.userId?.startsWith('#')
    ? message.userId
    : null;
  const timer = useRef(null);

  function triggerAddFriend() {
    if (senderTag) {
      window.dispatchEvent(new CustomEvent('open-friend-add', { detail: senderTag }));
    }
  }

  return (
    <div
      className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}
      onContextMenu={(e) => {
        e.preventDefault();
        triggerAddFriend();
      }}
      onTouchStart={() => {
        timer.current = setTimeout(triggerAddFriend, 600);
      }}
      onTouchEnd={() => clearTimeout(timer.current)}
      onTouchMove={() => clearTimeout(timer.current)}
      onTouchCancel={() => clearTimeout(timer.current)}
    >
      <div
        className={`max-w-[80%] rounded px-2 py-1 ${isSelf ? 'bg-blue-100' : 'bg-slate-100'}`}
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
