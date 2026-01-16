import type { BookDetail, BooksResult } from '@/types/book';
import type { SqlJsDatabase } from './sql';
import { getBooks, searchBooks, getBookDetail } from './sql';
import { errorService } from './errorService';

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
      errorService.logBackground(error, 'query-getBooks');
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
      errorService.logBackground(error, 'query-searchBooks');
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
      errorService.logBackground(error, 'query-getBookDetail');
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
}

// Export singleton instance for use across components
export const queryService = new QueryService();

// Export class for testing
export { QueryService };
