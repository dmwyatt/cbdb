import { useState, useEffect, useRef } from 'react';
import { useLibraryStore } from '@/store/libraryStore';
import { fetchCovers } from '@/lib/api';
import { getCachedCovers, saveCachedCovers } from '@/lib/indexeddb';
import type { Book } from '@/types/book';

const BATCH_SIZE = 25;

export function useCovers(books: Book[]) {
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const libraryPath = useLibraryStore((s) => s.libraryPath);
  const fetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!books.length || !libraryPath) return;

    // Only fetch for books that have covers and haven't been fetched yet
    const pathsToFetch = books
      .filter((b) => b.has_cover && !fetchedRef.current.has(b.path))
      .map((b) => b.path);

    if (!pathsToFetch.length) return;

    // Mark as being fetched to prevent duplicate requests
    pathsToFetch.forEach((p) => fetchedRef.current.add(p));

    const load = async () => {
      setLoading(true);

      try {
        // 1. Check cache first
        const cached = await getCachedCovers(pathsToFetch);
        if (Object.keys(cached).length > 0) {
          setCovers((prev) => ({ ...prev, ...cached }));
        }

        // 2. Find uncached paths
        const uncached = pathsToFetch.filter((p) => !cached[p]);
        if (!uncached.length) {
          setLoading(false);
          return;
        }

        // 3. Fetch uncached in batches of 25
        for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
          const batch = uncached.slice(i, i + BATCH_SIZE);
          try {
            const fetched = await fetchCovers(libraryPath, batch);
            if (Object.keys(fetched).length > 0) {
              setCovers((prev) => ({ ...prev, ...fetched }));
              await saveCachedCovers(fetched);
            }
          } catch (e) {
            console.error('Failed to fetch covers batch:', e);
          }
        }
      } catch (e) {
        console.error('Failed to load covers:', e);
      }

      setLoading(false);
    };

    load();
  }, [books, libraryPath]);

  // Clear the fetched set when library path changes
  useEffect(() => {
    fetchedRef.current.clear();
    setCovers({});
  }, [libraryPath]);

  return { covers, loading };
}
