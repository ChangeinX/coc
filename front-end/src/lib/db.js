import { openDB } from 'idb';

const dbPromise = openDB('coc-cache', 4, {
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
    if (oldVersion < 4) {
      transaction.objectStore('icons').clear();
    }
  },
});

export async function getApiCache(path) {
  try {
    return (await dbPromise).get('api', path);
  } catch {
    return undefined;
  }
}

export async function putApiCache(record) {
  try {
    return (await dbPromise).put('api', record);
  } catch {
    return undefined;
  }
}

export async function getClanCache(key) {
  try {
    return (await dbPromise).get('clans', key);
  } catch {
    return undefined;
  }
}

export async function putClanCache(record) {
  try {
    return (await dbPromise).put('clans', record);
  } catch {
    return undefined;
  }
}

export async function getIconCache(url) {
  try {
    return (await dbPromise).get('icons', url);
  } catch {
    return undefined;
  }
}

export async function putIconCache(record) {
  try {
    return (await dbPromise).put('icons', record);
  } catch {
    return undefined;
  }
}
