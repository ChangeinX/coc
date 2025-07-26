import React, { useEffect, useRef, useState } from 'react';
import { fetchJSONCached } from '../lib/api.js';
import { graphqlRequest } from '../lib/gql.js';
import { addOutboxMessage } from '../lib/db.js';
import useChat from '../hooks/useChat.js';
import useMultiChat, { globalShardFor } from '../hooks/useMultiChat.js';
import ChatMessage from './ChatMessage.jsx';
import Loading from './Loading.jsx';
import FriendsPanel from './FriendsPanel.jsx';
import AddFriendDialog from './AddFriendDialog.jsx';
import DirectChatDrawer from './DirectChatDrawer.jsx';

export default function ChatPanel({
  chatId = null,
  userId = '',
  globalIds = [],
  friendIds = [],
  initialTab = null,
}) {
  const [tab, setTab] = useState(initialTab || (chatId ? 'Clan' : 'Global'));
  const clanChat = chatId ? useChat(chatId) : { messages: [], loadMore: () => {}, hasMore: false, appendMessage: () => {} };
  const globalChat = useMultiChat(globalIds);
  const friendChat = useMultiChat(friendIds);
  const current = tab === 'Clan' ? clanChat : tab === 'Global' ? globalChat : friendChat;
  const { messages, loadMore, hasMore, appendMessage } = current;
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [infoMap, setInfoMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [directChatId, setDirectChatId] = useState(null);
  const endRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (e.detail) {
        setDirectChatId(e.detail);
        setTab('Friends');
      }
    };
    window.addEventListener('open-direct-chat', handler);
    return () => window.removeEventListener('open-direct-chat', handler);
  }, []);

  async function handleScroll(e) {
    const el = e.target;
    if (el.scrollTop < 100 && hasMore && !loadingMore) {
      setLoadingMore(true);
      try {
        await loadMore();
      } finally {
        setLoadingMore(false);
      }
    }
  }

useEffect(() => {
  if (endRef.current && typeof endRef.current.scrollIntoView === 'function') {
    requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }
}, [messages, infoMap]);

  useEffect(() => {
    let ignore = false;

    function getSender(msg) {
      return msg.senderId ?? msg.userId;
    }

    function isPlayerTag(id) {
      return id?.startsWith('#');
    }

    async function loadInfo() {
      if (messages.length === 0) {
        setLoading(false);
        return;
      }
      const ids = [...new Set(messages.map(getSender).filter(Boolean))];
      const missing = ids.filter((id) => !infoMap[id]);
      if (missing.length === 0) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const fetched = await Promise.all(
        missing.map((id) => {
          const path = isPlayerTag(id)
            ? `/player/${encodeURIComponent(id)}`
            : `/player/by-user/${encodeURIComponent(id)}`;
          return fetchJSONCached(path).catch(() => null);
        })
      );
      if (ignore) return;
      const updated = { ...infoMap };
      missing.forEach((id, idx) => {
        const data = fetched[idx];
        if (data) {
          updated[id] = {
            name: data.name,
            icon: data.leagueIcon,
            tag: data.tag,
          };
        }
      });
      setInfoMap(updated);
      setLoading(false);
    }

    loadInfo();

    return () => {
      ignore = true;
    };
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    if (tab === 'Clan' && !chatId) return;
    setSending(true);
    let targetId = chatId;
    if (tab === 'Global') {
      targetId = globalShardFor(userId);
    }
    const localMsg = {
      chatId: targetId,
      content: trimmed,
      senderId: userId,
      ts: new Date().toISOString(),
    };
    console.log('Publishing message', trimmed, 'to', targetId);
    try {
      await graphqlRequest(
        `mutation($chatId: ID!, $content: String!) { sendMessage(chatId:$chatId, content:$content){ id } }`,
        { chatId: targetId, content: trimmed },
      );
      setText('');
    } catch (err) {
      console.error('Failed to publish message', err);
      await addOutboxMessage(localMsg);
      appendMessage(localMsg);
    }
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b sticky top-0 bg-white z-10">
        {['Clan', 'Friends', 'Global'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-3 py-2 ${tab === t ? 'border-b-2 border-blue-600 font-medium' : 'text-slate-600'}`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'Friends' ? (
        <FriendsPanel />
      ) : (
        <>
        <div
          ref={containerRef}
          onScroll={handleScroll}
          data-testid="message-scroll"
          className="flex-1 overflow-y-auto min-h-0 space-y-2 p-4 pt-4"
        >
          {tab === 'Clan' && !chatId ? (
            <div className="py-20 text-center text-slate-500 text-sm">
              Please join a clan to chat…
            </div>
          ) : (
            <>
              {loadingMore && (
                <div className="text-center text-sm text-slate-500">
                  Loading more…
                </div>
              )}
              {loading ? (
                <div className="py-20">
                  <Loading />
                  <div className="text-center text-sm text-slate-500 mt-2">
                    Loading messages…
                  </div>
                </div>
              ) : (
                messages.map((m, idx) => {
                  const sender = m.senderId ?? m.userId;
                  return (
                    <ChatMessage
                      key={m.ts || idx}
                      message={m}
                      info={infoMap[sender]}
                      isSelf={sender === userId}
                    />
                  );
                })
              )}
              <div ref={endRef} />
            </>
          )}
        </div>
        {tab !== 'Friends' && !(tab === 'Clan' && !chatId) && (
          <form onSubmit={handleSubmit} className="flex gap-2 p-2 border-t">
            <input
              className="flex-1 border rounded px-2 py-1"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message…"
            />
            <button
              type="submit"
              className="px-3 py-1 rounded bg-blue-600 text-white"
              disabled={sending}
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
          </form>
        )}
        </>
      )}
      <DirectChatDrawer
        chatId={directChatId}
        userId={userId}
        open={!!directChatId}
        onClose={() => setDirectChatId(null)}
      />
      <AddFriendDialog />
    </div>
  );
}
