import type { BookDetail, BooksResult } from '@/types/book';
import type { BookFilters, SortOptions, FilterOptions } from '@/types/filters';
import type { SqlJsDatabase } from './sql';
import { getBooks, searchBooks, getBookDetail, getFilterOptions, getBooksByFilters } from './sql';
import { log, LogCategory } from './logger';

/**
 * Result types that include query timing information
 */
export interface QueryResult<T> {
  data: T;
  queryTime: number;
}

export interface BooksQueryResult extends QueryResult<BooksResult> {
  data: BooksResult;
}

export interface BookDetailQueryResult extends QueryResult<BookDetail | null> {
  data: BookDetail | null;
}

export interface FilterOptionsQueryResult extends QueryResult<FilterOptions> {
  data: FilterOptions;
}

/**
 * QueryService provides a unified interface for database queries.
 * - Encapsulates timing/metrics collection
 * - Provides consistent error handling
 * - Single place for query optimization
 */
class QueryService {
  private db: SqlJsDatabase | null = null;

  /**
   * Set the database instance to use for queries
   */
  setDatabase(db: SqlJsDatabase | null): void {
    this.db = db;
  }

  /**
   * Check if the service has a database connection
   */
  hasDatabase(): boolean {
    return this.db !== null;
  }

  /**
   * Get paginated list of all books
   */
  getBooks(page: number, perPage: number): BooksQueryResult {
    if (!this.db) {
      return {
        data: { books: [], total: 0 },
        queryTime: 0,
      };
    }

    const startTime = performance.now();
    try {
      const result = getBooks(this.db, page, perPage);
      const queryTime = performance.now() - startTime;
      return { data: result, queryTime };
    } catch (error) {
      const queryTime = performance.now() - startTime;
      log.warn(LogCategory.QUERY, 'getBooks query failed', error);
      return {
        data: { books: [], total: 0 },
        queryTime,
      };
    }
  }

  /**
   * Search books by title or author
   */
  searchBooks(term: string, page: number, perPage: number): BooksQueryResult {
    if (!this.db) {
      return {
        data: { books: [], total: 0 },
        queryTime: 0,
      };
    }

    const startTime = performance.now();
    try {
      const result = searchBooks(this.db, term, page, perPage);
      const queryTime = performance.now() - startTime;
      return { data: result, queryTime };
    } catch (error) {
      const queryTime = performance.now() - startTime;
      log.warn(LogCategory.QUERY, 'searchBooks query failed', error);
      return {
        data: { books: [], total: 0 },
        queryTime,
      };
    }
  }

  /**
   * Get detailed information about a specific book
   */
  getBookDetail(bookId: number): BookDetailQueryResult {
    if (!this.db) {
      return { data: null, queryTime: 0 };
    }

    const startTime = performance.now();
    try {
      const result = getBookDetail(this.db, bookId);
      const queryTime = performance.now() - startTime;
      return { data: result, queryTime };
    } catch (error) {
      const queryTime = performance.now() - startTime;
      log.warn(LogCategory.QUERY, 'getBookDetail query failed', error);
      return { data: null, queryTime };
    }
  }

  /**
   * Convenience method: get books or search based on whether a search term is provided
   */
  queryBooks(
    searchTerm: string | null,
    page: number,
    perPage: number
  ): BooksQueryResult {
    if (searchTerm && searchTerm.trim()) {
      return this.searchBooks(searchTerm, page, perPage);
    }
    return this.getBooks(page, perPage);
  }

  /**
   * Get available filter options from the database
   */
  getFilterOptions(): FilterOptionsQueryResult {
    if (!this.db) {
      return {
        data: { tags: [], series: [], publishers: [], formats: [] },
        queryTime: 0,
      };
    }

    const startTime = performance.now();
    try {
      const result = getFilterOptions(this.db);
      const queryTime = performance.now() - startTime;
      return { data: result, queryTime };
    } catch (error) {
      const queryTime = performance.now() - startTime;
      log.warn(LogCategory.QUERY, 'getFilterOptions query failed', error);
      return {
        data: { tags: [], series: [], publishers: [], formats: [] },
        queryTime,
      };
    }
  }

  /**
   * Query books with filters and sorting
   */
  queryBooksWithFilters(
    searchTerm: string | null,
    filters: BookFilters,
    sort: SortOptions,
    page: number,
    perPage: number
  ): BooksQueryResult {
    if (!this.db) {
      return {
        data: { books: [], total: 0 },
        queryTime: 0,
      };
    }

    const startTime = performance.now();
    try {
      const result = getBooksByFilters(this.db, searchTerm, filters, sort, page, perPage);
      const queryTime = performance.now() - startTime;
      return { data: result, queryTime };
    } catch (error) {
      const queryTime = performance.now() - startTime;
      log.warn(LogCategory.QUERY, 'queryBooksWithFilters failed', error);
      return {
        data: { books: [], total: 0 },
        queryTime,
      };
    }
  }
}

// Export singleton instance for use across components
export const queryService = new QueryService();

// Export class for testing
export { QueryService };
