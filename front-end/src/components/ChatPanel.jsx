import React, { useEffect, useRef, useState } from 'react';
import { fetchJSON } from '../lib/api.js';
import useChat from '../hooks/useChat.js';

export default function ChatPanel({ groupId = '1' }) {
  const { messages } = useChat(groupId);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState('Clan');
  const endRef = useRef(null);

  useEffect(() => {
    if (endRef.current && typeof endRef.current.scrollIntoView === 'function') {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    console.log('Publishing message', trimmed, 'to', groupId);
    try {
      await fetchJSON('/chat/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, text: trimmed }),
      });
      setText('');
    } catch (err) {
      console.error('Failed to publish message', err);
    }
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b">
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
      {tab === 'Clan' ? (
        <>
          <div className="flex-1 overflow-y-auto space-y-2 p-4">
            {messages.map((m, idx) => (
              <div key={idx} className="bg-slate-100 rounded px-2 py-1">
                {m.content}
              </div>
            ))}
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
        </>
      ) : (
        <div className="flex-1 p-4">Coming soon...</div>
      )}
    </div>
  );
}
