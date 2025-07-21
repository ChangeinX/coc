import React from 'react';

export default function LegalModal({ onClose }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose}></div>
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-white w-full max-w-sm rounded-xl shadow-xl p-6 relative text-center space-y-2">
          <button className="absolute top-3 right-3 text-slate-400" onClick={onClose}>✕</button>
          <h3 className="text-xl font-semibold mb-2">Clan Boards</h3>
          <ul className="space-y-1">
            <li><a href="#" className="text-blue-600 hover:underline">Contact Us</a></li>
            <li><a href="#" className="text-blue-600 hover:underline">Privacy Policy</a></li>
            <li><a href="#" className="text-blue-600 hover:underline">Terms of Service</a></li>
            <li><a href="#" className="text-blue-600 hover:underline">About Us</a></li>
          </ul>
        </div>
      </div>
    </>
  );
}
