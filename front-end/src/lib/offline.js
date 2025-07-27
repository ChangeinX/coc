import { putApiCache } from './db.js';
import { sendSubscription } from './push.js';

export function initOffline() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg && msg.type === 'api-update' && msg.url) {
        try {
          const url = new URL(msg.url);
          const path = url.pathname.replace('/api/v1', '');
          putApiCache({ path: `cache:${path}`, ts: Date.now(), data: msg.data, etag: msg.etag });
        } catch (err) {
          console.error('Failed to cache API update', err);
        }
      }
      if (msg && msg.type === 'pushsubscriptionchange' && msg.subscription) {
        sendSubscription(msg.subscription).catch((err) => {
          console.error('Failed to send subscription', err);
        });
      }
    });
  }
}
