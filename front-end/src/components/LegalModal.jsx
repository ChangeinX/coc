import React from 'react';
import { fetchJSON } from '../lib/api.js';

export default function LegalModal({ onClose }) {
  async function accept() {
    try {
      await fetchJSON('/user/legal', { method: 'POST' });
    } catch (err) {
      console.error('Failed to accept legal', err);
    }
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose}></div>
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-white w-full max-w-sm rounded-xl shadow-xl p-6 relative text-center space-y-4">
          <button className="absolute top-3 right-3 text-slate-400" onClick={onClose}>✕</button>
          <h3 className="text-xl font-semibold mb-2">Clan Boards</h3>
          <p className="text-sm">
            This material is unofficial and is not endorsed by Supercell. For more information see
            <a href="https://supercell.com/en/fan-content-policy/" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer"> Supercell's Fan Content Policy</a>.
          </p>
          <ul className="space-y-1">
            <li><a href="#" className="text-blue-600 hover:underline">Privacy Policy</a></li>
            <li><a href="#" className="text-blue-600 hover:underline">Terms of Service</a></li>
          </ul>
          <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded" onClick={accept}>Accept</button>
        </div>
      </div>
    </>
  );
}
