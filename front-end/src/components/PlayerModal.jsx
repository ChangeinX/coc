import React from 'react';
import PlayerSummary from './PlayerSummary.jsx';

export default function PlayerModal({ tag, onClose, refreshing = false }) {
  if (!tag) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose}></div>
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6 relative">
          <button className="absolute top-3 right-3 text-slate-400" onClick={onClose}>✕</button>
          <PlayerSummary tag={tag} />
        </div>
      </div>
    </>
  );
}
