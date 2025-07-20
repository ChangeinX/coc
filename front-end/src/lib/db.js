import { openDB } from 'idb';

const dbPromise = openDB('coc-cache', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('api')) {
      db.createObjectStore('api', { keyPath: 'path' });
    }
    if (!db.objectStoreNames.contains('clans')) {
      db.createObjectStore('clans', { keyPath: 'key' });
    }
  },
});

export async function getApiCache(path) {
  return (await dbPromise).get('api', path);
}

export async function putApiCache(record) {
  return (await dbPromise).put('api', record);
}

export async function getClanCache(key) {
  return (await dbPromise).get('clans', key);
}

export async function putClanCache(record) {
  return (await dbPromise).put('clans', record);
}
