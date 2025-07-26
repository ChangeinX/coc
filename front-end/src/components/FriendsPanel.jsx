import React, { useEffect, useRef, useState } from 'react';
import BottomSheet from './BottomSheet.jsx';
import PlayerMini from './PlayerMini.jsx';
import PlayerAvatar from './PlayerAvatar.jsx';
import FriendThread from './FriendThread.jsx';
import Loading from './Loading.jsx';
import { fetchJSONCached, fetchJSON } from '../lib/api.js';
import { graphqlRequest } from '../lib/gql.js';

export default function FriendsPanel({ onSelectChat }) {
  const [friends, setFriends] = useState(null);
  const [requests, setRequests] = useState(null);
  const [sub, setSub] = useState('');
  const [selected, setSelected] = useState(null);
  const [showReqs, setShowReqs] = useState(false);
  const [view, setView] = useState(() =>
    localStorage.getItem('friends-view') || 'stack',
  );
  const [visible, setVisible] = useState(50);
  const loadMoreRef = useRef(null);
  const longPress = useRef(false);
  const timer = useRef(null);

  useEffect(() => {
    fetchJSON('/user/me')
      .then((m) => setSub(m.sub))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!sub) return;
    const load = async () => {
      try {
        const list = await fetchJSONCached(`/friends/list?sub=${sub}`);
        setFriends(list);
      } catch {
        setFriends([]);
      }
      try {
        const reqs = await fetchJSONCached(`/friends/requests?sub=${sub}`);
        setRequests(reqs);
      } catch {
        setRequests([]);
      }
    };
    load();
  }, [sub]);

  useEffect(() => {
    if (!friends || friends.length <= 50) return;
    const el = loadMoreRef.current;
    if (!el) return;
    const ob = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisible((v) => Math.min(friends.length, v + 25));
      }
    });
    ob.observe(el);
    return () => ob.disconnect();
  }, [friends, visible]);


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

  const removeFriend = async (tag) => {
    if (!sub || !tag) return;
    try {
      await fetchJSON('/friends/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromSub: sub, toTag: tag }),
      });
      setFriends((f) => f.filter((x) => x.playerTag !== tag));
    } catch {
      alert('Failed to remove friend');
    }
    setSelected(null);
  };

  const startChat = async (friend) => {
    if (!friend?.userId) return;
    let chatId = null;
    try {
      const resp = await graphqlRequest(
        `mutation($id: ID!){ createDirectChat(recipientId:$id){ id } }`,
        { id: friend.userId },
      );
      chatId = resp.createDirectChat?.id || null;
    } catch {
      /* ignore */
    }
    if (onSelectChat) {
      onSelectChat(chatId);
    } else {
      window.dispatchEvent(new CustomEvent('open-direct-chat', { detail: chatId }));
    }
    setSelected(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b">
        <h4 className="font-medium flex items-center gap-2">
          Friends
          {requests && requests.length > 0 && (
            <button
              onClick={() => setShowReqs(true)}
              className="bg-blue-600 text-white rounded-full px-2 py-0.5 text-xs"
            >
              Pending {requests.length}
            </button>
          )}
        </h4>
        <div className="flex items-center gap-2">
          <button
            aria-label={view === 'row' ? 'Switch to stacked view' : 'Switch to row view'}
            className="text-sm text-blue-600"
            onClick={() => {
              const next = view === 'row' ? 'stack' : 'row';
              setView(next);
              localStorage.setItem('friends-view', next);
            }}
          >
            {view === 'row' ? 'Stack' : 'Row'}
          </button>
          <button
            className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-friend-add'));
            }}
          >
            +
          </button>
        </div>
      </div>
      <div
        className={
          view === 'row'
            ? 'p-4 overflow-x-auto flex gap-4 scroller'
            : 'p-4 overflow-y-auto flex-1'
        }
        data-testid="friends-container"
      >
        {view === 'row' ? (
          friends &&
          friends.map((f) => {
            function handlePointerDown(e) {
              if (e.pointerType !== 'mouse') {
                longPress.current = false;
                timer.current = setTimeout(() => {
                  longPress.current = true;
                  setSelected(f);
                }, 600);
              } else if (e.button === 2) {
                e.preventDefault();
                longPress.current = true;
                setSelected(f);
              }
            }

            function handlePointerUp() {
              clearTimeout(timer.current);
              if (!longPress.current) {
                startChat(f);
              }
            }

            function handleCancel() {
              clearTimeout(timer.current);
            }

            return (
              <div
                key={f.userId || f.playerTag}
                className="flex flex-col items-center cursor-pointer select-none"
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerCancel={handleCancel}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSelected(f);
                }}
              >
                <PlayerAvatar tag={f.playerTag} />
                {requests &&
                  requests.some((r) => r.playerTag === f.playerTag) && (
                    <span className="text-[10px] text-slate-500">\u23F3 Pending</span>
                  )}
              </div>
            );
          })
        ) : (
          <ul className="friends-list split space-y-2 w-full">
            {friends &&
              friends.slice(0, visible).map((f) => (
                <FriendThread
                  key={f.userId || f.playerTag}
                  friend={f}
                  pending={requests && requests.some((r) => r.playerTag === f.playerTag)}
                  onOpen={startChat}
                  onRemove={() => setSelected(f)}
                />
              ))}
            {friends && friends.length > visible && (
              <li ref={loadMoreRef} className="h-1" />
            )}
          </ul>
        )}
        {friends === null ? (
          <ul className="friends-list split space-y-2 w-full">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="thread skeleton" />
            ))}
          </ul>
        ) : friends.length === 0 ? (
          <div className="text-sm text-slate-500">No friends yet</div>
        ) : null}
      </div>

      <BottomSheet open={!!selected} onClose={() => setSelected(null)}>
        <div className="p-4 space-y-2">
          {selected && (
            <>
              <div className="text-center text-sm">Remove friend?</div>
              <PlayerMini tag={selected.playerTag} showTag={false} />
              <button
                className="w-full px-4 py-2 rounded bg-red-600 text-white"
                onClick={() => removeFriend(selected.playerTag)}
              >
                Remove
              </button>
            </>
          )}
        </div>
      </BottomSheet>

      <BottomSheet open={showReqs} onClose={() => setShowReqs(false)}>
        <div className="p-4 space-y-2">
          {requests && requests.map((r) => (
            <div key={r.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1">
                <PlayerMini tag={r.playerTag} showTag={false} />
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
          {requests === null ? (
            <Loading size={24} />
          ) : requests.length === 0 ? (
            <div className="text-sm text-slate-500">No requests</div>
          ) : null}
        </div>
      </BottomSheet>
    </div>
  );
}
