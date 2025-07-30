import React, { useRef } from 'react';
import PlayerMini from './PlayerMini.jsx';

export default function ChatMessage({ message, info, isSelf, cacheStrategy = 'indexed' }) {
  const { content, status } = message;
  const parts = [];
  const regex = /@(?:\{(#[^}]+)\}|(\w+))/g;
  let last = 0;
  let m;
  let idx = 0;
  while ((m = regex.exec(content)) !== null) {
    if (m.index > last) {
      parts.push(content.slice(last, m.index));
    }
    if (m[1]) {
      parts.push(
        <strong
          key={`mention-${idx++}`}
          className="font-bold text-slate-900 underline decoration-1"
        >
          <PlayerMini
            tag={m[1]}
            showTag={false}
            cacheStrategy={cacheStrategy}
          />
        </strong>
      );
    } else if (m[2]) {
      parts.push(
        <strong
          key={`mention-${idx++}`}
          className="font-bold text-slate-900 underline decoration-1"
        >
          @{m[2]}
        </strong>
      );
    }
    last = regex.lastIndex;
  }
  if (last < content.length) {
    parts.push(content.slice(last));
  }
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
    if (e.pointerType !== 'mouse') {
      e.preventDefault();
      timer.current = setTimeout(triggerAddFriend, 600);
    } else if (e.button === 2) {
      e.preventDefault();
      triggerAddFriend();
    }
  }

  function clearTimer() {
    clearTimeout(timer.current);
  }

  return (
    <div
      style={{ touchAction: 'none' }}
      className={`flex ${isSelf ? 'justify-end' : 'justify-start'} select-none`}
      onPointerDown={handlePointerDown}
      onPointerUp={clearTimer}
      onPointerCancel={clearTimer}
      onContextMenu={(e) => {
        e.preventDefault();
        triggerAddFriend();
      }}
    >
      <div
        className={`max-w-[80%] rounded px-2 py-1 select-none ${isSelf ? 'bg-blue-100' : 'bg-slate-100'}`}
      >
        {parts.map((p, i) => (
          <React.Fragment key={i}>{p}</React.Fragment>
        ))}
        {info && (
          <div className="mt-1 text-xs text-slate-500">
            <PlayerMini
              player={{ name: info.name, tag: senderTag, leagueIcon: info.icon }}
              showTag={false}
              cacheStrategy={cacheStrategy}
            />
          </div>
        )}
        {status === 'sending' && (
          <div className="mt-1 text-xs text-slate-500">Sending…</div>
        )}
        {status === 'failed' && (
          <div className="mt-1 text-xs text-red-500">Failed to send</div>
        )}
      </div>
    </div>
  );
}
