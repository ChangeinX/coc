import React, { Suspense, lazy, useEffect, useState } from 'react';
import Loading from './Loading.jsx';
import PlayerTagForm from './PlayerTagForm.jsx';
import { fetchJSON } from './api.js';

const Dashboard = lazy(() => import('./Dashboard.jsx'));
const ClanSearchModal = lazy(() => import('./ClanSearchModal.jsx'));
const ClanModal = lazy(() => import('./ClanModal.jsx'));

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
  const [clanInfo, setClanInfo] = useState(null);
  const [showClanInfo, setShowClanInfo] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

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
    const loadInfo = async () => {
      if (!clanTag) return;
      try {
        const data = await fetchJSON(`/clan/${encodeURIComponent(clanTag)}`);
        setClanInfo(data);
      } catch {
        /* ignore */
      }
    };
    loadInfo();
  }, [clanTag]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  useEffect(() => {
    window.lucide?.createIcons();
  });

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', '#1e3a8a');
    }
  }, []);

  if (!token) {
    return (
      <>
        <header className="banner bg-gradient-to-r from-blue-600 via-blue-700 to-slate-800 text-white p-4 text-center shadow-md">
          <h1 className="text-lg font-semibold">Clan Dashboard</h1>
        </header>
        <div className="flex justify-center items-center h-[calc(100vh-4rem)] p-2 sm:p-4">
          <div id="signin"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="banner bg-gradient-to-r from-blue-600 via-blue-700 to-slate-800 text-white p-4 flex items-center justify-between shadow-md">
        <h1 className="text-lg font-semibold flex items-center gap-2">
          {clanInfo?.badgeUrls && (
            <img src={clanInfo.badgeUrls.small} alt="badge" className="w-6 h-6" />
          )}
          <button onClick={() => setShowClanInfo(true)} className="hover:underline">
            {clanInfo?.name || 'Clan Dashboard'}
          </button>
        </h1>
        <div className="flex items-center gap-3">
          <button
            className="p-2 rounded hover:bg-slate-700"
            onClick={() => setShowSearch(true)}
          >
            <i data-lucide="search" className="w-5 h-5" />
          </button>
          <button
            title="Sign Out"
            className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-medium uppercase hover:bg-slate-600"
            onClick={() => {
              window.google?.accounts.id.disableAutoSelect();
              localStorage.removeItem('token');
              setToken(null);
              setPlayerTag(null);
              setClanTag(null);
            }}
          >
            {initials}
          </button>
        </div>
      </header>
      <main className="px-2 pt-0 pb-2 sm:px-4 sm:pt-0 sm:pb-4">
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
            <Dashboard defaultTag={clanTag} showSearchForm={false} onClanLoaded={setClanInfo} />
          </Suspense>
        )}
      </main>
      {showSearch && (
        <Suspense fallback={<Loading className="h-screen" />}>
          <ClanSearchModal onClose={() => setShowSearch(false)} onClanLoaded={setClanInfo} />
        </Suspense>
      )}
      {showClanInfo && (
        <Suspense fallback={<Loading className="h-screen" />}>
          <ClanModal clan={clanInfo} onClose={() => setShowClanInfo(false)} />
        </Suspense>
      )}
    </>
  );
}
