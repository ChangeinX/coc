import React, { Suspense, lazy } from 'react';
import Loading from './Loading.jsx';

const Dashboard = lazy(() => import('./Dashboard.jsx'));

export default function App() {
  return (
    <Suspense fallback={<Loading className="h-screen" />}> 
      <Dashboard />
    </Suspense>
  );
}
