import React, { useRef } from 'react';
import PlayerMini from './PlayerMini.jsx';

export default function ChatMessage({ message, info, isSelf }) {
  // Resolve a usable sender tag from the available fields
  const tag =
    message?.senderId ??
    message?.userId   ??
    info?.tag         ??
    null;

  // Refs to manage long‑press timing and ensure the menu opens only once
  const timerRef = useRef(null);
  const firedRef = useRef(false);

  const showMenu = () => {
    if (tag && !firedRef.current) {
      firedRef.current = true;
      window.dispatchEvent(
        new CustomEvent('open-friend-add', { detail: tag })
      );
    }
  };

  const handlePointerDown = (e) => {
    if (e.pointerType !== 'mouse') {
      e.preventDefault();
      timerRef.current = setTimeout(showMenu, 600);
    }
  };

  const clear = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    firedRef.current = false;
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    showMenu();
  };

  return (
    <div
      style={{ touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerUp={clear}
      onContextMenu={handleContextMenu}
      className={`flex ${isSelf ? 'justify-end' : 'justify-start'} select-none`}
    >
      {/* Message bubble */}
      <div className="max-w-xs rounded-2xl bg-gray-200 dark:bg-gray-700 p-2">
        {message?.content}

        {info && (
          <div className="mt-1 text-xs text-slate-500">
            <PlayerMini
              player={{ name: info.name, tag, leagueIcon: info.icon }}
              showTag={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
