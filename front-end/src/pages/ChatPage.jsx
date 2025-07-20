import React, { Suspense, lazy } from 'react';
import Loading from '../components/Loading.jsx';

const ChatPanel = lazy(() => import('../components/ChatPanel.jsx'));

export default function ChatPage({ verified, groupId, userId }) {
  return (
    <Suspense fallback={<Loading className="py-20" />}>
      {verified ? (
        <ChatPanel groupId={groupId} userId={userId} />
      ) : (
        <div className="p-4">Verify your account to chat.</div>
      )}
    </Suspense>
  );
}
