import React, { Suspense, lazy, useEffect, useState } from 'react';
import Loading from './Loading.jsx';
import PlayerTagForm from './PlayerTagForm.jsx';
import { fetchJSON } from './api.js';

const Dashboard = lazy(() => import('./Dashboard.jsx'));

function isTokenExpired(tok) {
  try {
    const payload = JSON.parse(atob(tok.split('.')[1]));
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

function getInitials(tok) {
  try {
    const payload = JSON.parse(atob(tok.split('.')[1]));
    const name = payload.name || '';
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  } catch {
    return '';
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
  const [initials, setInitials] = useState(() => (token ? getInitials(token) : ''));
  const [playerTag, setPlayerTag] = useState(null);
  const [clanTag, setClanTag] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);

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
    setInitials(token ? getInitials(token) : '');
  }, [token]);

  useEffect(() => {
    const loadUser = async () => {
      if (!token) return;
      setLoadingUser(true);
      try {
        const me = await fetchJSON('/user/me');
        setPlayerTag(me.player_tag);
        if (me.player_tag) {
          const player = await fetchJSON(`/player/${encodeURIComponent(me.player_tag)}`);
          if (player.clanTag) setClanTag(player.clanTag);
        }
      } catch {
        setToken(null);
      }
      setLoadingUser(false);
    };
    loadUser();
  }, [token]);

  useEffect(() => {
    const loadClan = async () => {
      if (!token || !playerTag) return;
      try {
        const player = await fetchJSON(`/player/${encodeURIComponent(playerTag)}`);
        if (player.clanTag) setClanTag(player.clanTag);
      } catch {
        /* ignore */
      }
    };
    loadClan();
  }, [playerTag, token]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  if (!token) {
    return (
      <>
        <header className="bg-gradient-to-r from-blue-600 to-slate-800 text-white p-4 text-center shadow-md">
          <h1 className="text-lg font-semibold">Clan Dashboard</h1>
        </header>
        <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
          <div id="signin"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="bg-gradient-to-r from-blue-600 to-slate-800 text-white p-4 flex items-center justify-between shadow-md">
        <h1 className="text-lg font-semibold">Clan Dashboard</h1>
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-medium uppercase">
            {initials}
          </span>
          <button
            className="px-3 py-1 text-sm rounded bg-slate-700"
            onClick={() => {
              window.google?.accounts.id.disableAutoSelect();
              localStorage.removeItem('token');
              setToken(null);
              setPlayerTag(null);
              setClanTag(null);
            }}
          >
            Sign Out
          </button>
        </div>
      </header>
      {loadingUser && <Loading className="h-[calc(100vh-4rem)]" />}
      {!loadingUser && !playerTag && (
        <PlayerTagForm
          onSaved={(tag) => {
            setPlayerTag(tag);
          }}
        />
      )}
      {!loadingUser && playerTag && (
        <Suspense fallback={<Loading className="h-screen" />}>
          <Dashboard defaultTag={clanTag} />
        </Suspense>
      )}
    </>
  );
}
