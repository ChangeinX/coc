import React, { Suspense, lazy, useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import CachedImage from './components/CachedImage.jsx';
import Loading from './components/Loading.jsx';
import PlayerTagForm from './components/PlayerTagForm.jsx';
import usePlayerInfo from './hooks/usePlayerInfo.js';
import useClanInfo from './hooks/useClanInfo.js';
import { useAuth } from './hooks/useAuth.jsx';
import useFeatures from './hooks/useFeatures.js';
import BottomNav from './components/BottomNav.jsx';
import DesktopNav from './components/DesktopNav.jsx';
import NotificationBanner from './components/NotificationBanner.jsx';
import { fetchJSON } from './lib/api.js';

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const ClanModal = lazy(() => import('./components/ClanModal.jsx'));
const LegalModal = lazy(() => import('./components/LegalModal.jsx'));
const DisclaimerModal = lazy(() => import('./components/DisclaimerModal.jsx'));
const DashboardPage = lazy(() => import('./pages/Dashboard.jsx'));
const ChatPage = lazy(() => import('./pages/ChatPage.jsx'));
const ScoutPage = lazy(() => import('./pages/Scout.jsx'));
const StatsPage = lazy(() => import('./pages/Stats.jsx'));
const AccountPage = lazy(() => import('./pages/Account.jsx'));
import LoginPage from './pages/Login.jsx';
const PushDebugPage = lazy(() => import('./pages/PushDebug.jsx'));

function getInitialsFromName(name) {
  try {
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
  const { user, logout, loading } = useAuth();
  const [initials, setInitials] = useState('');
  const [userId, setUserId] = useState('');
  const [numericId, setNumericId] = useState(null);
  const [playerTag, setPlayerTag] = useState(null);
  const [verified, setVerified] = useState(false);
  const [homeClanTag, setHomeClanTag] = useState(null);
  const [clanTag, setClanTag] = useState(null);
  const [clanInfo, setClanInfo] = useState(null);
  const [showClanInfo, setShowClanInfo] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [badgeCount, setBadgeCount] = useState(0);
  const { enabled: hasFeature } = useFeatures(user);
  const chatAllowed = hasFeature('chat');
  const menuRef = React.useRef(null);

  useEffect(() => {
    if (!user) return;
    async function check() {
      try {
        const res = await fetchJSON('/user/legal');
        const accepted = res.version === window.__LEGAL_VERSION__;
        if (!accepted || localStorage.getItem('tosAcceptedVersion') !== window.__LEGAL_VERSION__) {
          setShowLegal(true);
        }
      } catch (err) {
        console.error('Failed to check legal', err);
      }
    }
    check();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    async function checkDisc() {
      try {
        const res = await fetchJSON('/user/disclaimer');
        if (!res.seen) setShowDisclaimer(true);
      } catch (err) {
        console.error('Failed to check disclaimer', err);
      }
    }
    checkDisc();
  }, [user]);

  const playerInfo = usePlayerInfo(playerTag);
  const cachedClan = useClanInfo(clanTag);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    function handler(event) {
      const msg = event.data;
      if (msg && msg.type === 'badge-count') {
        setBadgeCount(msg.count || 0);
      }
    }
    navigator.serviceWorker.addEventListener('message', handler);
    navigator.serviceWorker.ready
      .then((reg) => {
        reg.active?.postMessage({ type: 'get-badge' });
      })
      .catch(() => {});
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    if (user) {
      setInitials(getInitialsFromName(user.name || ''));
      setUserId(user.sub || '');
    } else {
      setInitials('');
      setUserId('');
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setPlayerTag(null);
      setVerified(false);
      setNumericId(null);
      setClanTag(null);
      setHomeClanTag(null);
      setLoadingUser(false);
      return;
    }
    setLoadingUser(true);
    setPlayerTag(user.player_tag);
    setVerified(user.verified);
    setUserId(user.sub);
    setNumericId(user.id);
    setLoadingUser(false);
  }, [user]);

  useEffect(() => {
    if (playerTag) setLoadingUser(false);
  }, [playerTag]);

  useEffect(() => {
    if (playerInfo && playerInfo.clanTag) {
      setClanTag(playerInfo.clanTag);
      if (!homeClanTag) setHomeClanTag(playerInfo.clanTag);
    }
  }, [playerInfo]);

  useEffect(() => {
    if (cachedClan) setClanInfo(cachedClan);
  }, [cachedClan]);



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

  if (loading) {
    return <Loading className="h-screen" />;
  }

  if (!user) {
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
                    logout();
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
      <DesktopNav clanIcon={clanInfo?.badgeUrls?.small} badgeCount={badgeCount} />
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
      <BottomNav clanIcon={clanInfo?.badgeUrls?.small} badgeCount={badgeCount} />
      {showClanInfo && (
        <Suspense fallback={<Loading className="h-screen" />}>
          <ClanModal clan={clanInfo} onClose={() => setShowClanInfo(false)} />
        </Suspense>
      )}
      {showDisclaimer && (
        <Suspense fallback={<Loading className="h-screen" />}>
          <DisclaimerModal onClose={() => setShowDisclaimer(false)} />
        </Suspense>
      )}
      {showLegal && (
        <Suspense fallback={<Loading className="h-screen" />}>
          <LegalModal
            onAccept={() => {
              localStorage.setItem('tosAcceptedVersion', window.__LEGAL_VERSION__);
              setShowLegal(false);
            }}
            onDiscard={() => {
              setShowLegal(false);
              logout();
            }}
          />
        </Suspense>
      )}
    </Router>
  );
}
