import React, { useEffect, useRef, useState } from 'react';
import BottomSheet from './BottomSheet.jsx';
import PlayerMini from './PlayerMini.jsx';
import { fetchJSON } from '../lib/api.js';

export default function FriendsPanel() {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [sub, setSub] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showReqs, setShowReqs] = useState(false);
  const [newTag, setNewTag] = useState('');
  const inputRef = useRef(null);
  const prevRequests = useRef([]);

  useEffect(() => {
    fetchJSON('/user/me')
      .then((m) => setSub(m.sub))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!sub) return;
    const load = async () => {
      try {
        const list = await fetchJSON(`/friends/list?sub=${sub}`);
        setFriends(list);
      } catch {
        setFriends([]);
      }
      try {
        const reqs = await fetchJSON(`/friends/requests?sub=${sub}`);
        setRequests(reqs);
        prevRequests.current = reqs;
      } catch {
        setRequests([]);
        prevRequests.current = [];
      }
    };
    load();
  }, [sub]);

  useEffect(() => {
    if (showAdd && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showAdd]);

  useEffect(() => {
    const handler = (e) => {
      setNewTag(e.detail || '');
      setShowAdd(true);
    };
    window.addEventListener('open-friend-add', handler);
    return () => window.removeEventListener('open-friend-add', handler);
  }, []);

  const sendRequest = async () => {
    const trimmed = newTag.trim();
    if (!trimmed || !sub) return;
    const temp = { id: Date.now(), playerTag: trimmed };
    setRequests((r) => [...r, temp]);
    setShowAdd(false);
    setNewTag('');
    try {
      await fetchJSON('/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromSub: sub, toTag: trimmed }),
      });
    } catch {
      setRequests((r) => r.filter((x) => x.id !== temp.id));
      alert('Failed to send request');
    }
  };

  const respond = async (req, accept) => {
    try {
      await fetchJSON('/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: req.id, accept }),
      });
      setRequests((r) => r.filter((x) => x.id !== req.id));
      if (accept) {
        setFriends((f) => [...f, { userId: req.fromUserId, playerTag: req.playerTag }]);
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b">
        <h4 className="font-medium flex items-center gap-2">
          Friends
          {requests.length > 0 && (
            <button
              onClick={() => setShowReqs(true)}
              className="bg-blue-600 text-white rounded-full px-2 py-0.5 text-xs"
            >
              Pending {requests.length}
            </button>
          )}
        </h4>
        <button
          className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center"
          onClick={() => setShowAdd(true)}
        >
          +
        </button>
      </div>
      <div className="p-4 space-y-2 overflow-y-auto flex-1">
        {friends.map((f) => (
          <div key={f.userId || f.playerTag} className="flex items-center gap-2">
            <PlayerMini tag={f.playerTag} />
            {requests.some((r) => r.playerTag === f.playerTag) && (
              <span className="text-xs text-slate-500">\u23F3 Pending</span>
            )}
          </div>
        ))}
        {friends.length === 0 && (
          <div className="text-sm text-slate-500">No friends yet</div>
        )}
      </div>

      <BottomSheet open={showAdd} onClose={() => setShowAdd(false)}>
        <div className="p-4 space-y-2">
          <input
            ref={inputRef}
            className="w-full border rounded px-3 py-2"
            placeholder="Player Tag"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
          />
          <button
            className="w-full px-4 py-2 rounded bg-blue-600 text-white"
            onClick={sendRequest}
          >
            Send
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={showReqs} onClose={() => setShowReqs(false)}>
        <div className="p-4 space-y-2">
          {requests.map((r) => (
            <div key={r.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1">
                <PlayerMini tag={r.playerTag} />
              </span>
              <button
                className="px-2 py-0.5 rounded bg-green-600 text-white"
                onClick={() => respond(r, true)}
              >
                Accept
              </button>
              <button
                className="px-2 py-0.5 rounded bg-red-600 text-white"
                onClick={() => respond(r, false)}
              >
                Reject
              </button>
            </div>
          ))}
          {requests.length === 0 && (
            <div className="text-sm text-slate-500">No requests</div>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}
