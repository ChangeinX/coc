import { openDB } from 'idb';

const dbPromise = openDB('coc-cache', 3, {
  upgrade(db, oldVersion, newVersion, transaction) {
    if (oldVersion < 1) {
      db.createObjectStore('api', { keyPath: 'path' });
      db.createObjectStore('clans', { keyPath: 'key' });
    }
    if (oldVersion < 2) {
      db.createObjectStore('icons', { keyPath: 'url' });
    }
    if (oldVersion < 3 && oldVersion >= 2) {
      transaction.objectStore('icons').clear();
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

export async function getIconCache(url) {
  return (await dbPromise).get('icons', url);
}

export async function putIconCache(record) {
  return (await dbPromise).put('icons', record);
}
