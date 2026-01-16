/**
 * Filter and sort types for book queries
 */

export interface BookFilters {
  tags: string[];
  series: string | null;
  minRating: number | null; // 1-5 (will be converted to 2-10 for DB)
  publisher: string | null;
  format: string | null;
}

export type SortField = 'title' | 'author' | 'pubdate' | 'rating' | 'series_index' | 'timestamp';
export type SortOrder = 'asc' | 'desc';

export interface SortOptions {
  field: SortField;
  order: SortOrder;
}

export const DEFAULT_FILTERS: BookFilters = {
  tags: [],
  series: null,
  minRating: null,
  publisher: null,
  format: null,
};

export const DEFAULT_SORT: SortOptions = {
  field: 'title',
  order: 'asc',
};

/**
 * Available options for filter dropdowns (populated from database)
 */
export interface FilterOptions {
  tags: string[];
  series: string[];
  publishers: string[];
  formats: string[];
}
