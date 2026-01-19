import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookGrid } from './BookGrid';
import { BookTable } from './BookTable';
import { ViewToggle } from './ViewToggle';
import { FilterPanel } from './FilterPanel';
import { Pagination } from './Pagination';
import { StatusBar } from '@/components/layout/StatusBar';
import { useLibraryStore } from '@/store/libraryStore';
import { useDebounce } from '@/hooks/useDebounce';
import { queryService } from '@/lib/queryService';
import { calculateTotalPages } from '@/lib/pagination';

export function Library() {
  const navigate = useNavigate();
  const {
    db,
    currentView,
    currentPage,
    perPage,
    searchTerm,
    filters,
    sort,
    setPage,
  } = useLibraryStore();

  const debouncedSearchTerm = useDebounce(searchTerm, 150);

  // Use queryService for all database queries - it handles timing and error handling
  const { books, total, queryTime, queryError } = useMemo(() => {
    if (!db) return { books: [], total: 0, queryTime: 0, queryError: null };
    const result = queryService.queryBooksWithFilters(
      debouncedSearchTerm,
      filters,
      sort,
      currentPage,
      perPage
    );
    return {
      books: result.data.books,
      total: result.data.total,
      queryTime: result.queryTime,
      queryError: result.error,
    };
  }, [db, debouncedSearchTerm, filters, sort, currentPage, perPage]);

  const totalPages = calculateTotalPages(total, perPage);

  const handleBookClick = (bookId: number) => {
    navigate(`/book/${bookId}`);
  };

  return (
    <>
      <StatusBar queryTime={queryTime} />

      <main className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
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

        <FilterPanel />

        {queryError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium">Query Error</p>
            <p className="text-red-600 text-sm mt-1">{queryError}</p>
          </div>
        )}

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
    </>
  );
}
