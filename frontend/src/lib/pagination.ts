/**
 * Pagination utilities - centralized logic for pagination calculations.
 *
 * This module provides:
 * - Type definitions for pagination parameters
 * - Helper functions for offset and total pages calculations
 * - Single source of truth for pagination logic
 */

/**
 * Parameters for paginated queries
 */
export interface PaginationParams {
  page: number;
  perPage: number;
}

/**
 * Result metadata for paginated responses
 */
export interface PaginationResult {
  total: number;
  totalPages: number;
  currentPage: number;
  perPage: number;
}

/**
 * Calculate the SQL OFFSET for a given page number.
 * Page numbers are 1-indexed (first page = 1).
 *
 * @param page - Current page number (1-indexed)
 * @param perPage - Number of items per page
 * @returns The offset to use in SQL LIMIT/OFFSET
 */
export function calculateOffset(page: number, perPage: number): number {
  return (page - 1) * perPage;
}

/**
 * Calculate the total number of pages given total items and items per page.
 *
 * @param total - Total number of items
 * @param perPage - Number of items per page
 * @returns Total number of pages (minimum 1)
 */
export function calculateTotalPages(total: number, perPage: number): number {
  if (total <= 0 || perPage <= 0) return 1;
  return Math.ceil(total / perPage);
}

/**
 * Create a complete pagination result from query data.
 *
 * @param total - Total number of items from query
 * @param page - Current page number
 * @param perPage - Items per page
 * @returns Complete pagination metadata
 */
export function createPaginationResult(
  total: number,
  page: number,
  perPage: number
): PaginationResult {
  return {
    total,
    totalPages: calculateTotalPages(total, perPage),
    currentPage: page,
    perPage,
  };
}

/**
 * Clamp a page number to valid bounds.
 *
 * @param page - Requested page number
 * @param totalPages - Total available pages
 * @returns Valid page number within bounds
 */
export function clampPage(page: number, totalPages: number): number {
  if (page < 1) return 1;
  if (totalPages < 1) return 1;
  if (page > totalPages) return totalPages;
  return page;
}
