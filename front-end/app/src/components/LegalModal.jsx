import React from 'react';
import { fetchJSON } from '../lib/api.js';

export default function LegalModal({ onAccept, onDiscard }) {
  async function accept() {
    try {
      await fetchJSON('/user/legal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: window.__LEGAL_VERSION__ }),
      });
    } catch (err) {
      console.error('Failed to accept legal', err);
    }
    onAccept();
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onDiscard}></div>
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-white w-full max-w-sm rounded-xl shadow-xl p-6 relative text-center space-y-4">
          <button className="absolute top-3 right-3 text-slate-400" onClick={onDiscard}>✕</button>
          <h3 className="text-xl font-semibold mb-2">Clan Boards</h3>
          <p className="text-sm">
            By using this website, you agree to the storing of cookies on your device to enhance site navigation,
            analyze site usage, and assist in our marketing efforts. View our{' '}
            <a href="/privacy-policy" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>{' '}
            for more information.
          </p>
          <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded" onClick={accept}>Accept</button>
        </div>
      </div>
    </>
  );
}
