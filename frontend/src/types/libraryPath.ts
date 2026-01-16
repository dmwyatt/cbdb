/**
 * Branded type for library paths to ensure type safety.
 *
 * This prevents accidentally passing arbitrary strings where a validated
 * library path is expected. Use `createLibraryPath()` to create instances.
 */

declare const libraryPathBrand: unique symbol;

/**
 * A validated Dropbox library path.
 * Created via `createLibraryPath()` after validation.
 */
export type LibraryPath = string & { readonly [libraryPathBrand]: typeof libraryPathBrand };

/**
 * Creates a LibraryPath from a validated string.
 * The path is trimmed and normalized (ensures leading slash, no trailing slash).
 *
 * @param path - The path string to convert
 * @returns A branded LibraryPath
 * @throws Error if path is empty after trimming
 */
export function createLibraryPath(path: string): LibraryPath {
  const trimmed = path.trim();
  if (!trimmed) {
    throw new Error('Library path cannot be empty');
  }

  // Normalize: ensure leading slash, remove trailing slash
  let normalized = trimmed;
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized as LibraryPath;
}

/**
 * Type guard to check if a value is a LibraryPath.
 * Note: At runtime this just checks if it's a non-empty string.
 * The branded type provides compile-time safety.
 */
export function isLibraryPath(value: unknown): value is LibraryPath {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Safely converts a potentially null/undefined value to LibraryPath or null.
 * Useful for reading from storage where the path might not exist.
 */
export function toLibraryPath(value: string | null | undefined): LibraryPath | null {
  if (!value) return null;
  try {
    return createLibraryPath(value);
  } catch {
    return null;
  }
}
