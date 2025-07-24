import React, { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { fetchJSON } from '../lib/api.js';
import Loading from '../components/Loading.jsx';
import VerifiedBadge from '../components/VerifiedBadge.jsx';
import ChatBadge from '../components/ChatBadge.jsx';
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
  const [newFriendId, setNewFriendId] = useState('');



  useEffect(() => {
    const load = async () => {
      try {
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
    if (!chatEnabled) return;
    let ignore = false;
    const load = async () => {
      try {
        const data = await graphqlRequest('query { listFriends { userId since } }');
        if (!ignore) setFriends(data.listFriends);
      } catch {
        if (!ignore) setFriends([]);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [chatEnabled]);

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
    <form className="max-w-md mx-auto space-y-6 pt-4" onSubmit={handleSubmit}>
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
              <div key={f.userId} className="text-sm text-slate-700">{f.userId}</div>
            ))}
            {friends.length === 0 && (
              <div className="text-sm text-slate-500">No friends yet</div>
            )}
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 border rounded px-2 py-1"
              placeholder="User ID"
              value={newFriendId}
              onChange={(e) => setNewFriendId(e.target.value)}
            />
            <button
              type="button"
              onClick={async () => {
                if (!newFriendId.trim()) return;
                try {
                  const token = localStorage.getItem('token');
                  await fetchJSON('/friends/request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      fromUserId: getSub(token || ''),
                      toUserId: newFriendId.trim(),
                    }),
                  });
                  setNewFriendId('');
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
