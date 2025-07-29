import React, { useEffect, useState } from 'react';
import { subscribeForPush } from '../lib/push.js';

export default function PushDebug() {
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setInfo(sub ? JSON.stringify(sub.toJSON(), null, 2) : 'No subscription');
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-4 space-y-2">
      <h2 className="text-lg font-medium">Push Subscription</h2>
      {error && <p className="text-red-600">{error}</p>}
      <pre className="bg-slate-100 p-2 text-xs overflow-x-auto whitespace-pre-wrap">{info}</pre>
      <button
        className="px-3 py-1 rounded bg-blue-600 text-white"
        onClick={async () => {
          try {
            await subscribeForPush();
            await load();
          } catch (e) {
            setError(String(e));
          }
        }}
      >
        Subscribe
      </button>
    </div>
  );
}
