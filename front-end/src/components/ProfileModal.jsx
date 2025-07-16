import React, { useEffect, useState } from 'react';
import { fetchJSON } from '../lib/api.js';
import Loading from './Loading.jsx';

export default function ProfileModal({ onClose }) {
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchJSON('/user/profile');
        setProfile(data);
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
      onClose();
    } catch {
      setSaving(false);
    }
  };

  if (!profile) return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose}></div>
      <div className="fixed inset-0 flex items-center justify-center z-50"><Loading className="py-8" /></div>
    </>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose}></div>
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <form className="bg-white w-full max-w-md rounded-xl shadow-xl p-6 relative space-y-4" onSubmit={handleSubmit}>
          <button type="button" className="absolute top-3 right-3 text-slate-400" onClick={onClose}>✕</button>
          <h3 className="text-xl font-semibold">Profile</h3>
          <label className="block">
            <span className="text-sm">War Weight</span>
            <input type="number" step="0.01" value={profile.risk_weight_war ?? 0} onChange={(e) => handleChange('risk_weight_war', parseFloat(e.target.value))} className="mt-1 w-full border px-2 py-1 rounded" />
          </label>
          <label className="block">
            <span className="text-sm">Idle Weight</span>
            <input type="number" step="0.01" value={profile.risk_weight_idle ?? 0} onChange={(e) => handleChange('risk_weight_idle', parseFloat(e.target.value))} className="mt-1 w-full border px-2 py-1 rounded" />
          </label>
          <label className="block">
            <span className="text-sm">Deficit Weight</span>
            <input type="number" step="0.01" value={profile.risk_weight_don_deficit ?? 0} onChange={(e) => handleChange('risk_weight_don_deficit', parseFloat(e.target.value))} className="mt-1 w-full border px-2 py-1 rounded" />
          </label>
          <label className="block">
            <span className="text-sm">Drop Weight</span>
            <input type="number" step="0.01" value={profile.risk_weight_don_drop ?? 0} onChange={(e) => handleChange('risk_weight_don_drop', parseFloat(e.target.value))} className="mt-1 w-full border px-2 py-1 rounded" />
          </label>
          <button type="submit" className="px-4 py-2 rounded bg-slate-800 text-white w-full">{saving ? 'Saving…' : 'Save'}</button>
        </form>
      </div>
    </>
  );
}
