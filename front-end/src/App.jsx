import React, { Suspense, lazy, useEffect, useState } from 'react';
import Loading from './Loading.jsx';

const Dashboard = lazy(() => import('./Dashboard.jsx'));

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  useEffect(() => {
    if (!token && window.google) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: (res) => setToken(res.credential),
      });
      window.google.accounts.id.renderButton(
        document.getElementById('signin'),
        { theme: 'outline', size: 'large' },
      );
      window.google.accounts.id.prompt();
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  if (!token) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div id="signin"></div>
      </div>
    );
  }

  return (
    <>
      <button
        className="absolute top-4 right-4 px-2 py-1 bg-slate-800 text-white rounded"
        onClick={() => {
          window.google?.accounts.id.disableAutoSelect();
          setToken(null);
        }}
      >
        Sign Out
      </button>
      <Suspense fallback={<Loading className="h-screen" />}>
        <Dashboard />
      </Suspense>
    </>
  );
}
