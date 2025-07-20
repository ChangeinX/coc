import React, { Suspense, lazy } from 'react';
import Loading from '../components/Loading.jsx';

const Dashboard = lazy(() => import('./Dashboard.jsx'));

export default function Stats() {
  return (
    <div className="h-[calc(100dvh-8rem)] flex flex-col overflow-hidden overscroll-y-contain p-4">
      <p className="mb-4">Enter a clan tag to view statistics.</p>
      <div className="flex-1 min-h-0">
        <Suspense fallback={<Loading className="py-20" />}>
          <Dashboard showSearchForm={true} />
        </Suspense>
      </div>
    </div>
  );
}
