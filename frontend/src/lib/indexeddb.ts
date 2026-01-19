import type { LibraryPath } from '@/types/libraryPath';

const DB_NAME = 'CalibreWASM';
const DB_VERSION = 3;
const STORE_NAME = 'cache';
const COVERS_STORE = 'covers';
const READING_PROGRESS_STORE = 'reading_progress';
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
      if (!db.objectStoreNames.contains(COVERS_STORE)) {
        db.createObjectStore(COVERS_STORE);
      }
      if (!db.objectStoreNames.contains(READING_PROGRESS_STORE)) {
        db.createObjectStore(READING_PROGRESS_STORE);
      }
    };
  });
}

export async function saveToCache(
  data: Uint8Array,
  libraryPath: LibraryPath
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
  libraryPath: LibraryPath
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

export async function getCacheTimestamp(): Promise<number | null> {
  try {
    const cacheDB = await openCacheDB();
    const tx = cacheDB.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const timestamp = await new Promise<number | undefined>((resolve, reject) => {
      const req = store.get(DB_CACHE_KEY + '_timestamp');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return timestamp || null;
  } catch (e) {
    console.warn('Failed to get cache timestamp:', e);
    return null;
  }
}

export async function getCachedCovers(
  paths: string[]
): Promise<Record<string, string>> {
  try {
    const cacheDB = await openCacheDB();
    const tx = cacheDB.transaction(COVERS_STORE, 'readonly');
    const store = tx.objectStore(COVERS_STORE);

    const results: Record<string, string> = {};

    await Promise.all(
      paths.map(
        (path) =>
          new Promise<void>((resolve) => {
            const req = store.get(path);
            req.onsuccess = () => {
              if (req.result) results[path] = req.result;
              resolve();
            };
            req.onerror = () => resolve();
          })
      )
    );

    return results;
  } catch (e) {
    console.warn('Failed to get cached covers:', e);
    return {};
  }
}

export async function saveCachedCovers(
  covers: Record<string, string>
): Promise<void> {
  try {
    const cacheDB = await openCacheDB();
    const tx = cacheDB.transaction(COVERS_STORE, 'readwrite');
    const store = tx.objectStore(COVERS_STORE);

    for (const [path, data] of Object.entries(covers)) {
      store.put(data, path);
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Failed to save covers to cache:', e);
  }
}

export async function clearCoversCache(): Promise<void> {
  try {
    const cacheDB = await openCacheDB();
    const tx = cacheDB.transaction(COVERS_STORE, 'readwrite');
    const store = tx.objectStore(COVERS_STORE);
    store.clear();
  } catch (e) {
    console.warn('Failed to clear covers cache:', e);
  }
}

// Reading progress types and functions
export interface ReadingProgress {
  bookId: number;
  cfi: string; // EPUB CFI location
  percentage: number; // 0-100
  lastRead: number; // timestamp
}

export async function saveReadingProgress(
  progress: ReadingProgress
): Promise<void> {
  try {
    const cacheDB = await openCacheDB();
    const tx = cacheDB.transaction(READING_PROGRESS_STORE, 'readwrite');
    const store = tx.objectStore(READING_PROGRESS_STORE);
    store.put(progress, `book_${progress.bookId}`);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Failed to save reading progress:', e);
  }
}

export async function getReadingProgress(
  bookId: number
): Promise<ReadingProgress | null> {
  try {
    const cacheDB = await openCacheDB();
    const tx = cacheDB.transaction(READING_PROGRESS_STORE, 'readonly');
    const store = tx.objectStore(READING_PROGRESS_STORE);

    const progress = await new Promise<ReadingProgress | undefined>(
      (resolve, reject) => {
        const req = store.get(`book_${bookId}`);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }
    );

    return progress || null;
  } catch (e) {
    console.warn('Failed to get reading progress:', e);
    return null;
  }
}

export async function getAllReadingProgress(): Promise<Record<number, ReadingProgress>> {
  try {
    const cacheDB = await openCacheDB();
    const tx = cacheDB.transaction(READING_PROGRESS_STORE, 'readonly');
    const store = tx.objectStore(READING_PROGRESS_STORE);

    const results: Record<number, ReadingProgress> = {};

    await new Promise<void>((resolve, reject) => {
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          const progress = cursor.value as ReadingProgress;
          results[progress.bookId] = progress;
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => reject(req.error);
    });

    return results;
  } catch (e) {
    console.warn('Failed to get all reading progress:', e);
    return {};
  }
}

export async function deleteReadingProgress(bookId: number): Promise<void> {
  try {
    const cacheDB = await openCacheDB();
    const tx = cacheDB.transaction(READING_PROGRESS_STORE, 'readwrite');
    const store = tx.objectStore(READING_PROGRESS_STORE);
    store.delete(`book_${bookId}`);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Failed to delete reading progress:', e);
  }
}
