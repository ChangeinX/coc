import React, { Suspense, lazy, useEffect, useState } from 'react';
import Loading from './Loading.jsx';

const Dashboard = lazy(() => import('./Dashboard.jsx'));

function isTokenExpired(tok) {
  try {
    const payload = JSON.parse(atob(tok.split('.')[1]));
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

export default function App() {
  const [token, setToken] = useState(() => {
    const stored = localStorage.getItem('token');
    if (stored && isTokenExpired(stored)) {
      localStorage.removeItem('token');
      return null;
    }
    return stored;
  });

  useEffect(() => {
    if (token && isTokenExpired(token)) {
      setToken(null);
      return;
    }
    if (!token && window.google) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: (res) => {
          localStorage.setItem('token', res.credential);
          setToken(res.credential);
        },
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
          localStorage.removeItem('token');
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
