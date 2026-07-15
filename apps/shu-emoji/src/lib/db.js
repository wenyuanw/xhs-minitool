const DB_NAME = 'shu-emoji-db';
const DB_VERSION = 1;

const STORES = {
  favorites: 'favorites',
  recent: 'recent',
  searchHistory: 'searchHistory',
};

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.favorites)) {
        db.createObjectStore(STORES.favorites, { keyPath: 'emoji' });
      }
      if (!db.objectStoreNames.contains(STORES.recent)) {
        db.createObjectStore(STORES.recent, { keyPath: 'emoji' });
      }
      if (!db.objectStoreNames.contains(STORES.searchHistory)) {
        db.createObjectStore(STORES.searchHistory, { keyPath: 'query' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function withStore(storeName, mode, fn) {
  const db = await openDb();
  const tx = db.transaction(storeName, mode);
  const store = tx.objectStore(storeName);
  const result = fn(store);
  await txDone(tx);
  return result;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getFavorites() {
  const rows = await withStore(STORES.favorites, 'readonly', (store) =>
    requestToPromise(store.getAll()),
  );
  return rows.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
}

export async function isFavorite(emoji) {
  const row = await withStore(STORES.favorites, 'readonly', (store) =>
    requestToPromise(store.get(emoji)),
  );
  return Boolean(row);
}

export async function toggleFavorite(emoji) {
  const exists = await isFavorite(emoji);
  await withStore(STORES.favorites, 'readwrite', (store) => {
    if (exists) store.delete(emoji);
    else store.put({ emoji, savedAt: Date.now() });
  });
  return !exists;
}

export async function getRecent(limit = 20) {
  const rows = await withStore(STORES.recent, 'readonly', (store) =>
    requestToPromise(store.getAll()),
  );
  return rows.sort((a, b) => (b.usedAt || 0) - (a.usedAt || 0)).slice(0, limit);
}

export async function pushRecent(emoji) {
  const now = Date.now();
  await withStore(STORES.recent, 'readwrite', (store) => {
    store.put({ emoji, usedAt: now });
  });
  const all = await getRecent(100);
  if (all.length > 20) {
    const drop = all.slice(20);
    await withStore(STORES.recent, 'readwrite', (store) => {
      drop.forEach((item) => store.delete(item.emoji));
    });
  }
}

export async function getSearchHistory(limit = 8) {
  const rows = await withStore(STORES.searchHistory, 'readonly', (store) =>
    requestToPromise(store.getAll()),
  );
  return rows.sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, limit);
}

export async function pushSearchHistory(query) {
  const q = String(query || '').trim();
  if (!q) return;
  await withStore(STORES.searchHistory, 'readwrite', (store) => {
    store.put({ query: q, at: Date.now() });
  });
  const all = await getSearchHistory(50);
  if (all.length > 20) {
    const drop = all.slice(20);
    await withStore(STORES.searchHistory, 'readwrite', (store) => {
      drop.forEach((item) => store.delete(item.query));
    });
  }
}
