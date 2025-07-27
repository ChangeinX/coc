import { fetchJSON } from './api.js';

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

export function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str);
}

export async function sendSubscription(sub, oldEndpoint = null) {
  if (!sub) return;
  const payload = {
    endpoint: sub.endpoint,
    p256dhKey: arrayBufferToBase64(sub.getKey('p256dh')),
    authKey: arrayBufferToBase64(sub.getKey('auth')),
    oldEndpoint,
  };
  await fetchJSON('/notifications/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function subscribeForPush() {
  if (!('serviceWorker' in navigator)) throw new Error('no sw');
  if (typeof Notification === 'undefined') throw new Error('no notifications');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('denied');
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY || ''),
  });
  await sendSubscription(sub);
  return sub;
}

export function listenForSubscriptionChanges() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg && msg.type === 'pushsubscriptionchange' && msg.subscription) {
      sendSubscription(msg.subscription, msg.oldEndpoint).catch(() => {});
    }
  });
}
