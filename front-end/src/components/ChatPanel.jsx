import React, { useEffect, useRef, useState } from 'react';
import { fetchJSONCached } from '../lib/api.js';
import { graphqlRequest } from '../lib/gql.js';
import { addOutboxMessage } from '../lib/db.js';
import useChat from '../hooks/useChat.js';
import useMultiChat, { globalShardFor } from '../hooks/useMultiChat.js';
import ChatMessage from './ChatMessage.jsx';
import Loading from './Loading.jsx';

export default function ChatPanel({ chatId = '1', userId = '', globalIds = [], friendIds = [] }) {
  const [tab, setTab] = useState('Clan');
  const clanChat = useChat(chatId);
  const globalChat = useMultiChat(globalIds);
  const friendChat = useMultiChat(friendIds);
  const current = tab === 'Clan' ? clanChat : tab === 'All' ? globalChat : friendChat;
  const { messages, loadMore, hasMore } = current;
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [infoMap, setInfoMap] = useState({});
  const [loading, setLoading] = useState(true);
  const endRef = useRef(null);

useEffect(() => {
  if (endRef.current && typeof endRef.current.scrollIntoView === 'function') {
    requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }
}, [messages, infoMap]);

  useEffect(() => {
    let ignore = false;

    async function loadInfo() {
      const ids = [...new Set(messages.map((m) => m.userId).filter(Boolean))];
      const missing = ids.filter((id) => !infoMap[id]);
      if (missing.length === 0) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const fetched = await Promise.all(
        missing.map((id) =>
          fetchJSONCached(`/player/${encodeURIComponent(id)}`).catch(() => null)
        )
      );
      if (ignore) return;
      const updated = { ...infoMap };
      missing.forEach((id, idx) => {
        const data = fetched[idx];
        if (data) {
          updated[id] = { name: data.name, icon: data.leagueIcon };
        }
      });
      setInfoMap(updated);
      setLoading(false);
    }

    if (messages.length) loadInfo();

    return () => {
      ignore = true;
    };
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    let targetId = chatId;
    if (tab === 'All') {
      targetId = globalShardFor(userId);
    }
    console.log('Publishing message', trimmed, 'to', targetId);
    try {
      await graphqlRequest(
        `mutation($chatId: ID!, $content: String!) { sendMessage(chatId:$chatId, content:$content){ id } }`,
        { chatId: targetId, content: trimmed },
      );
      setText('');
    } catch (err) {
      console.error('Failed to publish message', err);
      await addOutboxMessage({ chatId: targetId, content: trimmed });
    }
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b sticky top-0 bg-white z-10">
        {['Clan', 'Friends', 'All'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-3 py-2 ${tab === t ? 'border-b-2 border-blue-600 font-medium' : 'text-slate-600'}`}
          >
            {t}
          </button>
        ))}
      </div>
      <>
        <div className="flex-1 overflow-y-auto min-h-0 space-y-2 p-4 pt-4">
          {hasMore && !loading && (
            <button
              onClick={loadMore}
              className="block mx-auto mb-2 text-sm text-blue-600 underline"
            >
              Load earlier messages
            </button>
          )}
          {loading ? (
            <div className="py-20">
              <Loading />
              <div className="text-center text-sm text-slate-500 mt-2">
                Loading messages…
              </div>
            </div>
          ) : (
            messages.map((m, idx) =>
              infoMap[m.userId] ? (
                <ChatMessage
                  key={m.ts || idx}
                  message={m}
                  info={infoMap[m.userId]}
                  isSelf={m.userId === userId}
                />
              ) : null
            )
          )}
          <div ref={endRef} />
        </div>
        {tab !== 'Friends' && (
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
    </div>
  );
}
