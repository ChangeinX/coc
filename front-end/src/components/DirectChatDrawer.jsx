import React, { useEffect, useRef, useState } from 'react';
import ChatDrawer from './ChatDrawer.jsx';
import ChatMessage from './ChatMessage.jsx';
import Loading from './Loading.jsx';
import { fetchJSONCached } from '../lib/api.js';
import { graphqlRequest } from '../lib/gql.js';
import { addOutboxMessage } from '../lib/db.js';
import useChat from '../hooks/useChat.js';

export default function DirectChatDrawer({ chatId, userId, open, onClose }) {
  if (!open) return null;
  const { messages, loadMore, hasMore, appendMessage } = useChat(chatId);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [infoMap, setInfoMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const containerRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    if (endRef.current && typeof endRef.current.scrollIntoView === 'function') {
      requestAnimationFrame(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [messages, infoMap]);

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
    setSending(true);
    const localMsg = {
      chatId,
      content: trimmed,
      senderId: userId,
      ts: new Date().toISOString(),
    };
    try {
      await graphqlRequest(
        `mutation($chatId: ID!, $content: String!) { sendMessage(chatId:$chatId, content:$content){ id } }`,
        { chatId, content: trimmed },
      );
      setText('');
    } catch (err) {
      await addOutboxMessage(localMsg);
      appendMessage(localMsg);
    }
    setSending(false);
  };

  return (
    <ChatDrawer open={open} onClose={onClose}>
      <div className="flex flex-col h-full">
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto min-h-0 space-y-2 p-4 pt-4"
        >
          {loadingMore && (
            <div className="text-center text-sm text-slate-500">Loading more…</div>
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
        </div>
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
      </div>
    </ChatDrawer>
  );
}
