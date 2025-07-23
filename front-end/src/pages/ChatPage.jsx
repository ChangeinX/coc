import React, { Suspense, lazy } from 'react';
import Loading from '../components/Loading.jsx';
import { useEffect } from 'react';
import { graphqlRequest } from '../lib/gql.js';

const ChatPanel = lazy(() => import('../components/ChatPanel.jsx'));

export default function ChatPage({ verified, chatId, userId }) {
  useEffect(() => {
    if (!verified) return;
    (async () => {
      try {
        const data = await graphqlRequest('query { listChats { id } }');
        console.log('Subscribed chats', data.listChats.map((c) => c.id));
        // In a real implementation we'd notify the service worker here
      } catch (err) {
        console.error('Failed to fetch chat list', err);
      }
    })();
  }, [verified]);

  return (
    <div className="h-[calc(100dvh-8rem)] flex flex-col overflow-y-auto overscroll-y-contain">
      <Suspense fallback={<Loading className="py-20" />}>
        {verified ? (
          <ChatPanel chatId={chatId} userId={userId} />
        ) : (
          <div className="p-4">Verify your account to chat.</div>
        )}
      </Suspense>
    </div>
  );
}
