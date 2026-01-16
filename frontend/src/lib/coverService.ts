import { fetchCovers } from '@/lib/api';
import { getCachedCovers, saveCachedCovers } from '@/lib/indexeddb';
import { errorService } from '@/lib/errorService';
import type { LibraryPath } from '@/types/libraryPath';

const BATCH_SIZE = 25;

/**
 * CoverService - Single source of truth for cover fetching and caching.
 * Handles batching and caching internally so consumers don't need to.
 */
class CoverService {
  private pendingFetches = new Map<string, Promise<string | null>>();
  private libraryPath: LibraryPath | null = null;

  /**
   * Set the library path for cover fetching.
   * Must be called before fetching covers.
   */
  setLibraryPath(path: LibraryPath | null): void {
    if (this.libraryPath !== path) {
      this.libraryPath = path;
      this.pendingFetches.clear();
    }
  }

  /**
   * Get a single cover by path.
   * Returns base64-encoded image data, or null if not available.
   */
  async getCover(path: string): Promise<string | null> {
    const results = await this.getCovers([path]);
    return results.get(path) ?? null;
  }

  /**
   * Get multiple covers by path.
   * Checks cache first, fetches uncached covers in batches.
   * Returns a Map of path -> base64-encoded image data.
   */
  async getCovers(paths: string[]): Promise<Map<string, string>> {
    if (!this.libraryPath || paths.length === 0) {
      return new Map();
    }

    const results = new Map<string, string>();
    const pathsToFetch: string[] = [];

    // 1. Check cache first
    const cached = await getCachedCovers(paths);
    for (const path of paths) {
      if (cached[path]) {
        results.set(path, cached[path]);
      } else if (!this.pendingFetches.has(path)) {
        pathsToFetch.push(path);
      }
    }

    // 2. Wait for any pending fetches
    const pendingPaths = paths.filter((p) => this.pendingFetches.has(p) && !results.has(p));
    if (pendingPaths.length > 0) {
      const pendingResults = await Promise.all(
        pendingPaths.map(async (path) => {
          const result = await this.pendingFetches.get(path);
          return { path, result };
        })
      );
      for (const { path, result } of pendingResults) {
        if (result) {
          results.set(path, result);
        }
      }
    }

    // 3. Fetch uncached paths in batches
    if (pathsToFetch.length > 0) {
      await this.fetchInBatches(pathsToFetch, results);
    }

    return results;
  }

  private async fetchInBatches(
    paths: string[],
    results: Map<string, string>
  ): Promise<void> {
    const libraryPath = this.libraryPath;
    if (!libraryPath) return;

    // Create promises for each path and store in pendingFetches
    const resolvers = new Map<string, (value: string | null) => void>();
    for (const path of paths) {
      const promise = new Promise<string | null>((resolve) => {
        resolvers.set(path, resolve);
      });
      this.pendingFetches.set(path, promise);
    }

    // Fetch in batches
    for (let i = 0; i < paths.length; i += BATCH_SIZE) {
      const batch = paths.slice(i, i + BATCH_SIZE);
      try {
        const fetched = await fetchCovers(libraryPath, batch);

        // Save to cache
        if (Object.keys(fetched).length > 0) {
          await saveCachedCovers(fetched);
        }

        // Resolve promises and add to results
        for (const path of batch) {
          const data = fetched[path] ?? null;
          if (data) {
            results.set(path, data);
          }
          resolvers.get(path)?.(data);
        }
      } catch (e) {
        errorService.logBackground(e, 'cover-batch-fetch');
        // Resolve with null on error
        for (const path of batch) {
          resolvers.get(path)?.(null);
        }
      }
    }

    // Clean up pendingFetches
    for (const path of paths) {
      this.pendingFetches.delete(path);
    }
  }

  /**
   * Clear the pending fetch tracking.
   * Call when changing libraries or resetting state.
   */
  reset(): void {
    this.pendingFetches.clear();
    this.libraryPath = null;
  }
}

// Export singleton instance
export const coverService = new CoverService();
