import React from 'react';
import { proxyImageUrl } from '../lib/assets.js';

export default function ClanModal({ clan, onClose }) {
  if (!clan) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose}></div>
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6 relative">
          <button className="absolute top-3 right-3 text-slate-400" onClick={onClose}>✕</button>
          <div className="flex items-center gap-3">
            {clan.badgeUrls && (
              <img src={proxyImageUrl(clan.badgeUrls.medium)} alt="badge" className="w-12 h-12" />
            )}
            <div>
              <h3 className="text-xl font-semibold">{clan.name}</h3>
              <p className="text-sm text-slate-500">#{clan.tag}</p>
            </div>
          </div>
          {clan.description && (
            <p className="mt-4 whitespace-pre-line text-sm">{clan.description}</p>
          )}
        </div>
      </div>
    </>
  );
}
