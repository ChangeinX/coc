import React, { useState } from 'react';
import { subscribeForPush } from '../lib/push.js';

export default function NotificationBanner() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('dismiss-push') === '1');

  if (dismissed || typeof Notification === 'undefined' || Notification.permission === 'granted') {
    return null;
  }

  return (
    <div className="bg-blue-50 border-b border-blue-200 text-sm p-2 flex items-center justify-between">
      <span>Enable notifications to receive clan updates.</span>
      <div className="flex gap-2">
        <button
          className="px-3 py-1 rounded bg-blue-600 text-white"
          onClick={async () => {
            try {
              await subscribeForPush();
            } catch (err) {
              console.error('Failed to subscribe for push', err);
            }
            setDismissed(true);
          }}
        >
          Enable
        </button>
        <button
          className="p-1"
          onClick={() => {
            localStorage.setItem('dismiss-push', '1');
            setDismissed(true);
          }}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
