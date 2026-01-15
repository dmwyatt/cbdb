const DB_NAME = 'CalibreWASM';
const DB_VERSION = 1;
const STORE_NAME = 'cache';
const DB_CACHE_KEY = 'calibreMetadataDB';

function openCacheDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function saveToCache(
  data: Uint8Array,
  libraryPath: string
): Promise<void> {
  const cacheDB = await openCacheDB();
  const tx = cacheDB.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  store.put(data, DB_CACHE_KEY);
  store.put(Date.now(), DB_CACHE_KEY + '_timestamp');
  store.put(libraryPath, DB_CACHE_KEY + '_path');

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadFromCache(
  libraryPath: string
): Promise<Uint8Array | null> {
  try {
    const cacheDB = await openCacheDB();
    const tx = cacheDB.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    // Check if path matches
    const cachedPath = await new Promise<string | undefined>(
      (resolve, reject) => {
        const req = store.get(DB_CACHE_KEY + '_path');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }
    );

    if (cachedPath !== libraryPath) {
      return null;
    }

    const data = await new Promise<Uint8Array | undefined>((resolve, reject) => {
      const req = store.get(DB_CACHE_KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return data || null;
  } catch (e) {
    console.warn('Failed to load from cache:', e);
    return null;
  }
}

export async function clearCache(): Promise<void> {
  try {
    const cacheDB = await openCacheDB();
    const tx = cacheDB.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(DB_CACHE_KEY);
    store.delete(DB_CACHE_KEY + '_timestamp');
    store.delete(DB_CACHE_KEY + '_path');
  } catch (e) {
    console.warn('Failed to clear cache:', e);
  }
}
