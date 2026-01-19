import { useState, useEffect, useRef, useMemo } from 'react';
import { useLibraryStore } from '@/store/libraryStore';
import { coverService } from '@/lib/coverService';
import { log, LogCategory } from '@/lib/logger';
import type { Book } from '@/types/book';

interface CoversState {
  libraryPath: string | null;
  data: Record<string, string>;
}

export function useCovers(books: Book[]) {
  const [coversState, setCoversState] = useState<CoversState>({ libraryPath: null, data: {} });
  const [loading, setLoading] = useState(false);
  const libraryPath = useLibraryStore((s) => s.libraryPath);
  const fetchedRef = useRef<Set<string>>(new Set());

  // Derive covers - return empty object if libraryPath doesn't match stored path
  const covers = useMemo(() => {
    return coversState.libraryPath === libraryPath ? coversState.data : {};
  }, [coversState, libraryPath]);

  // Clear fetchedRef and set library path when libraryPath changes
  useEffect(() => {
    coverService.setLibraryPath(libraryPath);
    fetchedRef.current.clear();
  }, [libraryPath]);

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
        const results = await coverService.getCovers(pathsToFetch);
        const newCovers: Record<string, string> = {};
        results.forEach((value, key) => {
          newCovers[key] = value;
        });
        if (Object.keys(newCovers).length > 0) {
          setCoversState((prev) => ({
            libraryPath,
            data: prev.libraryPath === libraryPath
              ? { ...prev.data, ...newCovers }
              : newCovers,
          }));
        }
      } catch (e) {
        log.warn(LogCategory.COVER, 'Failed to load covers', e);
      }

      setLoading(false);
    };

    load();
  }, [books, libraryPath]);

  return { covers, loading };
}
