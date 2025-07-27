import React, { Suspense, lazy, useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import CachedImage from './components/CachedImage.jsx';
import Loading from './components/Loading.jsx';
import PlayerTagForm from './components/PlayerTagForm.jsx';
import { fetchJSON } from './lib/api.js';
import { getSub } from './lib/auth.js';
import useFeatures from './hooks/useFeatures.js';
import BottomNav from './components/BottomNav.jsx';
import DesktopNav from './components/DesktopNav.jsx';
import NotificationBanner from './components/NotificationBanner.jsx';

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const ClanModal = lazy(() => import('./components/ClanModal.jsx'));
const LegalModal = lazy(() => import('./components/LegalModal.jsx'));
const DashboardPage = lazy(() => import('./pages/Dashboard.jsx'));
const ChatPage = lazy(() => import('./pages/ChatPage.jsx'));
const ScoutPage = lazy(() => import('./pages/Scout.jsx'));
const StatsPage = lazy(() => import('./pages/Stats.jsx'));
const AccountPage = lazy(() => import('./pages/Account.jsx'));
const LoginPage = lazy(() => import('./pages/Login.jsx'));
const PushDebugPage = lazy(() => import('./pages/PushDebug.jsx'));

function isTokenExpired(tok) {
  try {
    const payload = JSON.parse(atob(tok.split('.')[1]));
    return Date.now() >= payload.exp * 1000;
  } catch (err) {
    console.error('Failed to parse token', err);
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
  } catch (err) {
    console.error('Failed to get initials', err);
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
  const [userId, setUserId] = useState(() => (token ? getSub(token) : ''));
  const [numericId, setNumericId] = useState(null);
  const [playerTag, setPlayerTag] = useState(null);
  const [verified, setVerified] = useState(false);
  const [homeClanTag, setHomeClanTag] = useState(null);
  const [clanTag, setClanTag] = useState(null);
  const [clanInfo, setClanInfo] = useState(null);
  const [showClanInfo, setShowClanInfo] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { enabled: hasFeature } = useFeatures(token);
  const chatAllowed = hasFeature('chat');
  const menuRef = React.useRef(null);

  useEffect(() => {
    if (token && isTokenExpired(token)) {
      setToken(null);
      return;
    }

    const tryInit = () => {
      if (!window.google) return false;
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
      return true;
    };

    if (!token) {
      if (!tryInit()) {
        const id = setInterval(() => {
          if (tryInit()) clearInterval(id);
        }, 100);
        return () => clearInterval(id);
      }
    }
  }, [token]);

  useEffect(() => {
    setInitials(token ? getInitials(token) : '');
    setUserId(token ? getSub(token) : '');
  }, [token]);

  useEffect(() => {
    const loadUser = async () => {
      if (!token) return;
      setLoadingUser(true);
      try {
        const me = await fetchJSON('/user/me');
        setPlayerTag(me.player_tag);
        setVerified(me.verified);
        setUserId(me.sub);
        setNumericId(me.id);
        if (me.player_tag) {
          const player = await fetchJSON(`/player/${encodeURIComponent(me.player_tag)}`);
          if (player.clanTag) {
            setClanTag(player.clanTag);
            setHomeClanTag(player.clanTag);
          }
        }
      } catch (err) {
        console.error('Failed to load user info', err);
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
        if (player.clanTag) {
          setClanTag(player.clanTag);
          if (!homeClanTag) setHomeClanTag(player.clanTag);
        }
      } catch (err) {
        console.error('Failed to load clan', err);
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
      } catch (err) {
        console.error('Failed to load clan info', err);
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
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', '#2563eb');
    }
  }, []);

  if (!token) {
    return (
      <Suspense fallback={<Loading className="h-screen" />}> 
        <LoginPage />
      </Suspense>
    );
  }

  return (
    <Router>
      <NotificationBanner />
      <header className="banner bg-gradient-to-r from-blue-600 via-blue-700 to-slate-800 text-white px-4 py-2 flex items-center justify-between shadow-md sticky top-0 z-50">
        <h1 className="flex flex-row items-center gap-1 sm:flex-col sm:items-start sm:gap-0 text-left">
          <span className="text-lg font-semibold cursor-pointer" onClick={() => setShowLegal(true)}>Clan Boards</span>
          <span className="flex items-center gap-1 text-sm hover:underline hidden sm:flex cursor-pointer" onClick={() => setShowClanInfo(true)}>
            {clanInfo?.badgeUrls?.small && (
              <CachedImage src={clanInfo.badgeUrls.small} alt="clan" className="w-5 h-5" />
            )}
            {clanInfo?.name || 'Clan Dashboard'}
          </span>
        </h1>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-sm hover:underline sm:hidden cursor-pointer" onClick={() => setShowClanInfo(true)}>
            {clanInfo?.badgeUrls?.small && (
              <CachedImage src={clanInfo.badgeUrls.small} alt="clan" className="w-5 h-5" />
            )}
            {clanInfo?.name || 'Clan Dashboard'}
          </span>
          {homeClanTag && clanTag !== homeClanTag && (
            <button
              className="p-2 rounded hover:bg-slate-700"
              onClick={() => setClanTag(homeClanTag)}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          {chatAllowed && null}
          <div className="relative hidden sm:block" ref={menuRef}>
            <button
              className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-medium uppercase hover:bg-slate-600"
              onClick={() => setShowMenu((v) => !v)}
              aria-expanded={showMenu}
            >
              {initials}
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-28 bg-white text-slate-700 rounded shadow-lg z-10">
                <Link
                  to="/account"
                  className="block w-full text-left px-3 py-2 hover:bg-slate-100"
                  onClick={() => setShowMenu(false)}
                >
                  Account
                </Link>
                <button
                  className="block w-full text-left px-3 py-2 hover:bg-slate-100"
                  onClick={() => {
                    window.google?.accounts.id.disableAutoSelect();
                    localStorage.removeItem('token');
                    window.location.hash = '#/';
                    setToken(null);
                    setPlayerTag(null);
                    setClanTag(null);
                    setShowMenu(false);
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <DesktopNav clanIcon={clanInfo?.badgeUrls?.small} />
      <main className="px-2 pt-0 pb-2 sm:px-4 sm:pt-0 sm:pb-4">
        {loadingUser && <Loading className="h-[calc(100dvh-4rem)]" />}
        {!loadingUser && !playerTag && (
          <PlayerTagForm
            onSaved={(tag) => {
              setPlayerTag(tag);
            }}
          />
        )}
        {!loadingUser && playerTag && (
          <Suspense fallback={<Loading className="py-20" />}>
            <Routes>
              <Route path="/" element={<DashboardPage defaultTag={clanTag} showSearchForm={false} onClanLoaded={setClanInfo} />} />
              <Route path="/chat" element={<ChatPage verified={verified} chatId={homeClanTag} userId={userId} />} />
              <Route path="/scout" element={<ScoutPage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/account" element={<AccountPage onVerified={() => setVerified(true)} />} />
              {import.meta.env.DEV && (
                <Route path="/push-debug" element={<PushDebugPage />} />
              )}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        )}
      </main>
      <BottomNav clanIcon={clanInfo?.badgeUrls?.small} />
      {showClanInfo && (
        <Suspense fallback={<Loading className="h-screen" />}>
          <ClanModal clan={clanInfo} onClose={() => setShowClanInfo(false)} />
        </Suspense>
      )}
      {showLegal && (
        <Suspense fallback={<Loading className="h-screen" />}>
          <LegalModal onClose={() => setShowLegal(false)} />
        </Suspense>
      )}
    </Router>
  );
}
