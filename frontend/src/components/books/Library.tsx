import { useMemo } from 'react';
import { BookGrid } from './BookGrid';
import { BookTable } from './BookTable';
import { ViewToggle } from './ViewToggle';
import { Pagination } from './Pagination';
import { BookModal } from './BookModal';
import { StatusBar } from '@/components/layout/StatusBar';
import { useLibraryStore } from '@/store/libraryStore';
import { useDebounce } from '@/hooks/useDebounce';
import { getBooks, searchBooks } from '@/lib/sql';

export function Library() {
  const {
    db,
    currentView,
    currentPage,
    perPage,
    searchTerm,
    setPage,
    setSelectedBookId,
  } = useLibraryStore();

  const debouncedSearchTerm = useDebounce(searchTerm, 150);

  const { books, total, queryTime } = useMemo(() => {
    if (!db) return { books: [], total: 0, queryTime: 0 };

    const startTime = performance.now();
    const result = debouncedSearchTerm
      ? searchBooks(db, debouncedSearchTerm, currentPage, perPage)
      : getBooks(db, currentPage, perPage);
    const queryTime = performance.now() - startTime;

    return { ...result, queryTime };
  }, [db, debouncedSearchTerm, currentPage, perPage]);

  const totalPages = Math.ceil(total / perPage);

  const handleBookClick = (bookId: number) => {
    setSelectedBookId(bookId);
  };

  return (
    <>
      <StatusBar queryTime={queryTime} />

      <main className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {debouncedSearchTerm ? `Search: "${debouncedSearchTerm}"` : 'All Books'}
            </h2>
            <p className="text-slate-500">
              {total} books found{' '}
              <span className="text-xs text-slate-400">({queryTime.toFixed(1)}ms)</span>
            </p>
          </div>
          <ViewToggle />
        </div>

        {currentView === 'grid' ? (
          <BookGrid books={books} onBookClick={handleBookClick} />
        ) : (
          <BookTable books={books} onBookClick={handleBookClick} />
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </main>

      <BookModal />
    </>
  );
}
