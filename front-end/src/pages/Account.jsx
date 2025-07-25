import React, { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { fetchJSON } from '../lib/api.js';
import Loading from '../components/Loading.jsx';
import VerifiedBadge from '../components/VerifiedBadge.jsx';
import ChatBadge from '../components/ChatBadge.jsx';
import PlayerMini from '../components/PlayerMini.jsx';
import RiskPrioritySelect, { PRESETS } from '../components/RiskPrioritySelect.jsx';
import { graphqlRequest } from '../lib/gql.js';
import { getSub } from '../lib/auth.js';

export default function Account({ onVerified }) {
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState('');
  const [chatEnabled, setChatEnabled] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [newFriendTag, setNewFriendTag] = useState('');
  const [selfId, setSelfId] = useState(null);
  const [selfSub, setSelfSub] = useState('');



  useEffect(() => {
    const load = async () => {
      try {
        const me = await fetchJSON('/user/me');
        setSelfId(me.id);
        setSelfSub(me.sub);
        const data = await fetchJSON('/user/profile');
        setProfile(data);
        const features = await fetchJSON('/user/features');
        setChatEnabled(features.all || features.features.includes('chat'));
      } catch {
        setProfile({});
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!chatEnabled || !selfSub) return;
    let ignore = false;
    const load = async () => {
      try {
        const data = await fetchJSON(`/friends/list?sub=${selfSub}`);
        if (!ignore) setFriends(data);
      } catch {
        if (!ignore) setFriends([]);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [chatEnabled, selfSub]);

  useEffect(() => {
    if (!chatEnabled || !selfSub) return;
    let ignore = false;
    const load = async () => {
      try {
        const data = await fetchJSON(`/friends/requests?sub=${selfSub}`);
        if (!ignore) setRequests(data);
      } catch {
        if (!ignore) setRequests([]);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [chatEnabled, selfSub]);

  const handleChange = (key, value) => {
    setProfile((p) => ({ ...p, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (chatEnabled && !profile.verified) {
      alert('You must verify your account to enable chat.');
      setSaving(false);
      return;
    }
    try {
      await fetchJSON('/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      await fetchJSON('/user/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: chatEnabled ? ['chat'] : [], all: false }),
      });
      window.dispatchEvent(new Event('features-updated'));
    } catch {
      setSaving(false);
      return;
    }
    setSaving(false);
  };

  if (!profile) return <Loading className="py-20" />;

  return (
    <form
      className="container mx-auto p-4 sm:p-6 space-y-6 max-w-md"
      onSubmit={handleSubmit}
    >
      <h3 className="text-xl font-semibold flex items-center gap-2">
        Profile
        {profile.verified && <VerifiedBadge />}
        {chatEnabled && <ChatBadge />}
      </h3>
      <div className="space-y-4">
        <h4 className="text-lg font-medium flex items-center gap-1">
          Risk Priority
          <button
            type="button"
            onClick={() => setShowInfo((v) => !v)}
            className="p-1"
          >
            <Info className="w-4 h-4 text-slate-600" />
          </button>
        </h4>
        {showInfo && (
          <p className="text-xs text-slate-600">
            Choose a preset to adjust how members are ranked by risk
          </p>
        )}
        <RiskPrioritySelect
          weights={profile}
          onSelect={(w) => {
            Object.entries(w).forEach(([k, v]) => handleChange(k, v));
          }}
        />
      </div>
      <div className="space-y-2">
        <h4 className="text-lg font-medium">Features</h4>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={chatEnabled} onChange={(e) => setChatEnabled(e.target.checked)} />
          <span className="text-sm">Enable Chat</span>
        </label>
      </div>
      {chatEnabled && (
        <div className="space-y-2">
          <h4 className="text-lg font-medium">Friends</h4>
          <div className="space-y-1">
            {friends.map((f) => (
              <div key={f.userId} className="text-sm text-slate-700">
                <PlayerMini tag={f.playerTag} />
              </div>
            ))}
            {friends.length === 0 && (
              <div className="text-sm text-slate-500">No friends yet</div>
            )}
          </div>
          {requests.length > 0 && (
            <div className="space-y-1">
              <h5 className="text-sm font-medium mt-2">Requests</h5>
              {requests.map((r) => (
                <div key={r.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1">
                    <PlayerMini tag={r.playerTag} />
                  </span>
                  <button
                    className="px-2 py-0.5 rounded bg-green-600 text-white"
                    onClick={async () => {
                      await fetchJSON('/friends/respond', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ requestId: r.id, accept: true }),
                      });
                      setRequests((reqs) => reqs.filter((x) => x.id !== r.id));
                    }}
                  >
                    Accept
                  </button>
                  <button
                    className="px-2 py-0.5 rounded bg-red-600 text-white"
                    onClick={async () => {
                      await fetchJSON('/friends/respond', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ requestId: r.id, accept: false }),
                      });
                      setRequests((reqs) => reqs.filter((x) => x.id !== r.id));
                    }}
                  >
                    Reject
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              className="flex-1 border rounded px-2 py-1"
              placeholder="Player Tag"
              value={newFriendTag}
              onChange={(e) => setNewFriendTag(e.target.value)}
            />
            <button
              type="button"
              onClick={async () => {
                if (!newFriendTag.trim() || !selfSub) return;
                try {
                  await fetchJSON('/friends/request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      fromSub: selfSub,
                      toTag: newFriendTag.trim(),
                    }),
                  });
                  setNewFriendTag('');
                  alert('Request sent');
                } catch (err) {
                  console.error('Failed to send friend request', err);
                  alert('Failed to send request');
                }
              }}
              className="px-3 py-1 rounded bg-blue-600 text-white"
            >
              Add Friend
            </button>
          </div>
        </div>
      )}
      {!profile.verified && (
        <>
          <label className="block">
            <span className="text-sm">API Token</span>
            <input value={token} onChange={(e) => setToken(e.target.value)} className="mt-1 w-full border px-2 py-1 rounded" />
          </label>
          <button
            type="button"
            onClick={async () => {
              setSaving(true);
              try {
                await fetchJSON('/user/verify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ token }),
                });
                await fetchJSON('/user/features', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    features: chatEnabled ? ['chat'] : [],
                    all: false,
                  }),
                });
                window.dispatchEvent(new Event('features-updated'));
                setProfile((p) => ({ ...p, verified: true }));
                onVerified && onVerified();
              } catch {
                /* ignore */
              }
              setSaving(false);
            }}
            className="px-4 py-2 rounded bg-slate-800 text-white w-full"
          >
            {saving ? 'Verifying…' : 'Verify'}
          </button>
        </>
      )}
      <button type="submit" className="px-4 py-2 rounded bg-slate-800 text-white w-full">
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button
        type="button"
        onClick={() => {
          window.google?.accounts.id.disableAutoSelect();
          localStorage.removeItem('token');
          window.location.hash = '#/';
          window.location.reload();
        }}
        className="px-4 py-2 rounded bg-red-600 text-white w-full"
      >
        Logout
      </button>
    </form>
  );
}
