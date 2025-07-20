import React, { useEffect, useState } from 'react';
import { fetchJSON } from '../lib/api.js';
import Loading from '../components/Loading.jsx';
import VerifiedBadge from '../components/VerifiedBadge.jsx';
import ChatBadge from '../components/ChatBadge.jsx';

export default function Account({ onVerified }) {
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState('');
  const [chatEnabled, setChatEnabled] = useState(false);

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

  const handleChange = (key, value) => {
    setProfile((p) => ({ ...p, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
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
    <form className="max-w-md mx-auto space-y-4" onSubmit={handleSubmit}>
      <h3 className="text-xl font-semibold flex items-center gap-2">
        Profile
        {profile.verified && <VerifiedBadge />}
        {chatEnabled && <ChatBadge />}
      </h3>
      <label className="block">
        <span className="text-sm">War Weight</span>
        <input
          type="number"
          step="0.01"
          value={profile.risk_weight_war ?? 0}
          onChange={(e) => handleChange('risk_weight_war', parseFloat(e.target.value))}
          className="mt-1 w-full border px-2 py-1 rounded"
        />
      </label>
      <label className="block">
        <span className="text-sm">Idle Weight</span>
        <input
          type="number"
          step="0.01"
          value={profile.risk_weight_idle ?? 0}
          onChange={(e) => handleChange('risk_weight_idle', parseFloat(e.target.value))}
          className="mt-1 w-full border px-2 py-1 rounded"
        />
      </label>
      <label className="block">
        <span className="text-sm">Deficit Weight</span>
        <input
          type="number"
          step="0.01"
          value={profile.risk_weight_don_deficit ?? 0}
          onChange={(e) => handleChange('risk_weight_don_deficit', parseFloat(e.target.value))}
          className="mt-1 w-full border px-2 py-1 rounded"
        />
      </label>
      <label className="block">
        <span className="text-sm">Drop Weight</span>
        <input
          type="number"
          step="0.01"
          value={profile.risk_weight_don_drop ?? 0}
          onChange={(e) => handleChange('risk_weight_don_drop', parseFloat(e.target.value))}
          className="mt-1 w-full border px-2 py-1 rounded"
        />
      </label>
      <label className="inline-flex items-center gap-2">
        <input type="checkbox" checked={chatEnabled} onChange={(e) => setChatEnabled(e.target.checked)} />
        <span className="text-sm">Enable Chat</span>
      </label>
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
