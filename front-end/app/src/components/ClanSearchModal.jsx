import React, { Suspense, lazy } from 'react';
import Loading from './Loading.jsx';

const Dashboard = lazy(() => import('../pages/Dashboard.jsx'));

export default function ClanSearchModal({ onClose, onClanLoaded }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose}></div>
      <div className="fixed inset-0 overflow-y-auto flex items-start justify-center p-4 z-50">
        <div className="relative bg-white w-full max-w-4xl rounded shadow p-4 sm:p-6">
          <button className="absolute top-3 right-3 text-slate-400" onClick={onClose}>
            ✕
          </button>
          <Suspense fallback={<Loading className="py-8" />}>
            <Dashboard showSearchForm={true} onClanLoaded={(c) => { onClanLoaded?.(c); onClose(); }} />
          </Suspense>
        </div>
      </div>
    </>
  );
}
