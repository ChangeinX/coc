import React, { Suspense, lazy, useEffect, useState } from 'react';
import Loading from '../components/Loading.jsx';
import { graphqlRequest } from '../lib/gql.js';

const ChatPanel = lazy(() => import('../components/ChatPanel.jsx'));

export default function ChatPage({ verified, chatId, userId }) {
  const [globalIds, setGlobalIds] = useState([]);
  const [friendIds, setFriendIds] = useState([]);

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
        if (navigator.serviceWorker?.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'subscribe-chats',
            ids,
          });
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
          <ChatPanel chatId={chatId} userId={userId} globalIds={globalIds} friendIds={friendIds} />
        ) : (
          <div className="p-4">Verify your account to chat.</div>
        )}
      </Suspense>
    </div>
  );
}
