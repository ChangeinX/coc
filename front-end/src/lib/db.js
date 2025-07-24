import { openDB } from 'idb';

const dbPromise = openDB('coc-cache', 6, {
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
    if (oldVersion < 5) {
      db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
    }
    if (oldVersion < 6) {
      db.createObjectStore('messages', { keyPath: 'chatId' });
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

export async function addOutboxMessage(record) {
  return (await dbPromise).add('outbox', record);
}

export async function getOutboxMessages() {
  return (await dbPromise).getAll('outbox');
}

export async function removeOutboxMessage(id) {
  return (await dbPromise).delete('outbox', id);
}

export async function getMessageCache(chatId) {
  return (await dbPromise).get('messages', chatId);
}

export async function putMessageCache(record) {
  return (await dbPromise).put('messages', record);
}
