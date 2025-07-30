import React, { useEffect, useState } from 'react';

export default function Toast() {
  const [msg, setMsg] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handler(e) {
      if (e.detail) {
        setMsg(e.detail);
        setVisible(true);
        setTimeout(() => setVisible(false), 3000);
      }
    }
    window.addEventListener('toast', handler);
    return () => window.removeEventListener('toast', handler);
  }, []);

  if (!visible) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-3 py-2 rounded shadow-md z-50">
      {msg}
    </div>
  );
}
