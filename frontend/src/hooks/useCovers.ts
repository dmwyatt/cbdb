import { useState, useEffect, useRef } from 'react';
import { useLibraryStore } from '@/store/libraryStore';
import { coverService } from '@/lib/coverService';
import { log, LogCategory } from '@/lib/logger';
import type { Book } from '@/types/book';

export function useCovers(books: Book[]) {
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const libraryPath = useLibraryStore((s) => s.libraryPath);
  const fetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    coverService.setLibraryPath(libraryPath);
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
          setCovers((prev) => ({ ...prev, ...newCovers }));
        }
      } catch (e) {
        log.warn(LogCategory.COVER, 'Failed to load covers', e);
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
