import React, { Suspense, lazy, useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import Loading from '../components/Loading.jsx';
import { graphqlRequest } from '../lib/gql.js';
import useRestrictions from '../hooks/useRestrictions.js';

const ChatPanel = lazy(() => import('../components/ChatPanel.jsx'));

export default function ChatPage({ verified, chatId, userId }) {
  const location = useLocation();
  const [globalIds, setGlobalIds] = useState([]);
  const [friendIds, setFriendIds] = useState([]);
  const restriction = useRestrictions(userId);
  const search = new URLSearchParams(location.search);
  const initialTab = search.get('tab');
  const initialUser = search.get('user');
  const initialDirectId = useMemo(() => {
    if (!initialUser || !userId) return null;
    return userId < initialUser
      ? `direct#${userId}#${initialUser}`
      : `direct#${initialUser}#${userId}`;
  }, [initialUser, userId]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => {
          reg.active?.postMessage({ type: 'clear-badge' });
        })
        .catch(() => {});
    }
  }, [chatId]);

  useEffect(() => {
    if (!verified) return;
    (async () => {
      try {
        const data = await graphqlRequest('query { listChats { id kind } }');
        const ids = data.listChats.map((c) => c.id);
        const globals = data.listChats.filter((c) => c.kind === 'GLOBAL').map((c) => c.id);
        const directs = data.listChats.filter((c) => c.kind === 'DIRECT').map((c) => c.id);
        setGlobalIds(globals);
        setFriendIds(directs);
        console.log('Subscribed chats', ids);
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready
            .then((reg) => {
              reg.active?.postMessage({ type: 'subscribe-chats', ids });
            })
            .catch(() => {});
        }
      } catch (err) {
        console.error('Failed to fetch chat list', err);
      }
    })();
  }, [verified]);

  return (
    <div className="h-[calc(100dvh-8rem)] flex flex-col overflow-y-auto overscroll-y-contain">
      <Suspense fallback={<Loading className="py-20" />}>
        {verified ? (
          <ChatPanel
            chatId={chatId}
            userId={userId}
            globalIds={globalIds}
          friendIds={friendIds}
          initialTab={initialTab ? initialTab.charAt(0).toUpperCase() + initialTab.slice(1) : undefined}
          initialDirectId={initialDirectId}
          restriction={restriction}
        />
        ) : (
          <div className="p-4">Verify your account to chat.</div>
        )}
      </Suspense>
    </div>
  );
}
