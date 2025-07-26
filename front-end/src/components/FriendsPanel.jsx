import React, { useEffect, useRef, useState } from 'react';
import { LayoutList, LayoutGrid } from 'lucide-react';
import { FixedSizeList as List } from 'react-window';
import BottomSheet from './BottomSheet.jsx';
import FriendThread from './FriendThread.jsx';
import SkeletonThread from './SkeletonThread.jsx';
import PlayerMini from './PlayerMini.jsx';
import PlayerAvatar from './PlayerAvatar.jsx';
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
  const listRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [previews, setPreviews] = useState({});

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

  function directId(a, b) {
    return a < b ? `direct#${a}#${b}` : `direct#${b}#${a}`;
  }

  useEffect(() => {
    if (!friends || !sub) return;
    let ignore = false;
    async function loadPreviews() {
      const entries = await Promise.all(
        friends.map(async (f) => {
          const chat = directId(sub, f.userId);
          try {
            const data = await graphqlRequest(
              `query($id: ID!, $limit: Int){ getMessages(chatId:$id, limit:$limit){ content ts } }`,
              { id: chat, limit: 1 },
            );
            const msgs = Array.isArray(data.getMessages) ? data.getMessages : [];
            const latest = msgs[msgs.length - 1];
            return [
              f.userId,
              latest ? { content: latest.content, ts: latest.ts } : null,
            ];
          } catch {
            return [f.userId, null];
          }
        }),
      );
      if (!ignore) setPreviews(Object.fromEntries(entries));
    }
    loadPreviews();
    return () => {
      ignore = true;
    };
  }, [friends, sub]);


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

  useEffect(() => {
    if (!friends || friends.length <= 50) {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisible(true);
        obs.disconnect();
      }
    });
    if (listRef.current) obs.observe(listRef.current);
    return () => obs.disconnect();
  }, [friends]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b">
        <h4 className="font-medium flex items-center gap-2">
          Friends
          <button
            aria-label={view === 'row' ? 'Switch to stacked view' : 'Switch to row view'}
            className="text-blue-600"
            onClick={() => {
              const next = view === 'row' ? 'stack' : 'row';
              setView(next);
              localStorage.setItem('friends-view', next);
            }}
          >
            {view === 'row' ? <LayoutList className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
          </button>
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
            className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-friend-add'));
            }}
          >
            +
          </button>
        </div>
      </div>
      <div className="friends-wrapper flex-1" ref={listRef}>
        {friends === null && <div className="p-4"><Loading size={24} /></div>}
        {friends && friends.length === 0 && (
          <div className="p-4 text-sm text-slate-500">No friends yet</div>
        )}
        {friends && friends.length > 0 && (
          friends.length > 50 ? (
            visible ? (
              <List
                height={400}
                itemCount={friends.length}
                itemSize={56}
                width="100%"
                outerElementType="ul"
                className="friends-list list-none p-0 m-0"
                itemData={{ friends, previews }}
              >
                {({ index, style, data }) => {
                  const f = data.friends[index];
                  const preview = data.previews[f.userId];
                  const pending = requests?.some((r) => r.playerTag === f.playerTag);
                  return (
                    <div style={style}>
                      <FriendThread
                        friend={f}
                        pending={pending}
                        preview={preview?.content}
                        ts={preview?.ts}
                        onSelect={startChat}
                        onRemove={() => removeFriend(f.playerTag)}
                      />
                    </div>
                  );
                }}
              </List>
            ) : (
              <ul className="friends-list py-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <SkeletonThread key={i} />
                ))}
              </ul>
            )
          ) : (
            <ul
              className={`friends-list ${
                view === 'row'
                  ? 'flex gap-4 px-0 overflow-x-auto scroller'
                  : 'py-2 overflow-y-auto'
              }`}
              data-testid="friends-container"
            >
              {friends.map((f) => (
                <FriendThread
                  key={f.userId || f.playerTag}
                  friend={f}
                  pending={requests?.some((r) => r.playerTag === f.playerTag)}
                  preview={previews[f.userId]?.content}
                  ts={previews[f.userId]?.ts}
                  onSelect={startChat}
                  onRemove={() => setSelected(f)}
                />
              ))}
            </ul>
          )
        )}
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
