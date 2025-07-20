import React, { useState, lazy, Suspense } from 'react';
import MobileTabs from '../components/MobileTabs.jsx';
import Loading from '../components/Loading.jsx';

const ChatPanel = lazy(() => import('../components/ChatPanel.jsx'));
const Dashboard = lazy(() => import('./Dashboard.jsx'));

export default function Community({ verified, groupId, userId, onClanSelect }) {
  const [tab, setTab] = useState('chat');

  return (
    <div>
      <MobileTabs
        tabs={[
          { label: 'Chat', value: 'chat' },
          { label: 'Scouting', value: 'scouting' },
          { label: 'Stats', value: 'stats' },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'chat' && (
        <Suspense fallback={<Loading className="py-20" />}>
          {verified ? (
            <ChatPanel groupId={groupId} userId={userId} />
          ) : (
            <div className="p-4">Verify your account to chat.</div>
          )}
        </Suspense>
      )}
      {tab === 'scouting' && <div className="p-4">Coming soon...</div>}
      {tab === 'stats' && (
        <Suspense fallback={<Loading className="py-20" />}>
          <Dashboard showSearchForm={true} onClanLoaded={onClanSelect} />
        </Suspense>
      )}
    </div>
  );
}
