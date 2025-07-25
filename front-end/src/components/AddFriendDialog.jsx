import React, { useEffect, useRef, useState } from 'react';
import BottomSheet from './BottomSheet.jsx';
import { fetchJSON } from '../lib/api.js';

export default function AddFriendDialog({ sub: propSub = null, friends: propFriends = null }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('add');
  const [tag, setTag] = useState('');
  const [sub, setSub] = useState(propSub);
  const [friends, setFriends] = useState(propFriends || []);
  const inputRef = useRef(null);

  useEffect(() => {
    if (propSub) setSub(propSub);
  }, [propSub]);

  useEffect(() => {
    if (propFriends) setFriends(propFriends);
  }, [propFriends]);

  useEffect(() => {
    const handler = async (e) => {
      const t = e.detail || '';
      setTag(t);
      let curSub = propSub || sub;
      let curFriends = propFriends || friends;
      if (!propSub || !propFriends) {
        try {
          if (!curSub) {
            const me = await fetchJSON('/user/me');
            curSub = me.sub;
          }
          if (!propFriends && curSub) {
            curFriends = await fetchJSON(`/friends/list?sub=${curSub}`);
          }
        } catch {
          curFriends = curFriends || [];
        }
      }
      setSub(curSub);
      setFriends(curFriends || []);
      if (t && curFriends && curFriends.some((f) => f.playerTag === t)) {
        setMode('remove');
      } else {
        setMode('add');
      }
      setOpen(true);
    };
    window.addEventListener('open-friend-add', handler);
    return () => window.removeEventListener('open-friend-add', handler);
  }, [propSub, propFriends, sub, friends]);

  useEffect(() => {
    if (open && mode === 'add' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open, mode]);

  const sendRequest = async () => {
    const trimmed = tag.trim();
    if (!trimmed || !sub) return;
    setOpen(false);
    setTag('');
    try {
      await fetchJSON('/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromSub: sub, toTag: trimmed }),
      });
    } catch {
      alert('Failed to send request');
    }
  };

  const removeFriend = async () => {
    if (!sub || !tag) return;
    try {
      await fetchJSON('/friends/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromSub: sub, toTag: tag }),
      });
    } catch {
      alert('Failed to remove friend');
    }
    setOpen(false);
  };

  return (
    <BottomSheet open={open} onClose={() => setOpen(false)}>
      <div className="p-4 space-y-2">
        {mode === 'add' ? (
          <>
            <input
              ref={inputRef}
              className="w-full border rounded px-3 py-2"
              placeholder="Player Tag"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
            />
            <button
              className="w-full px-4 py-2 rounded bg-blue-600 text-white"
              onClick={sendRequest}
            >
              Send
            </button>
          </>
        ) : (
          <>
            <div className="text-center text-sm">Unfriend {tag}?</div>
            <button
              className="w-full px-4 py-2 rounded bg-red-600 text-white"
              onClick={removeFriend}
            >
              Unfriend
            </button>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
