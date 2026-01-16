import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  initializeSqlJs,
  createDatabase,
  validateDatabase,
  type SqlJsDatabase,
} from '@/lib/sql';
import { downloadDatabase } from '@/lib/api';
import { saveToCache, loadFromCache, clearCache, getCacheTimestamp } from '@/lib/indexeddb';
import { queryService } from '@/lib/queryService';
import { offlineService } from '@/lib/offlineService';
import { errorService } from '@/lib/errorService';
import { type LibraryPath, createLibraryPath, toLibraryPath } from '@/types/libraryPath';

export type ViewMode = 'grid' | 'table';

export type { LibraryPath };

interface LibraryState {
  // Database state
  db: SqlJsDatabase | null;
  isLoading: boolean;
  loadingProgress: number;
  loadingMessage: string;
  error: string | null;
  loadedFromCache: boolean;
  dbSize: number;
  lastSyncTime: number | null;

  // Library configuration (persisted)
  libraryPath: LibraryPath | null;

  // View state (persisted)
  currentView: ViewMode;
  currentPage: number;
  perPage: number;
  searchTerm: string;

  // Actions
  setLibraryPath: (path: string) => void;
  loadDatabase: (forceRefresh?: boolean) => Promise<void>;
  refreshDatabase: () => Promise<void>;
  setView: (view: ViewMode) => void;
  setSearchTerm: (term: string) => void;
  setPage: (page: number) => void;
  resetLibrary: () => Promise<void>;
  setError: (error: string) => void;
  clearError: () => void;
  cancelLoading: () => void;
}

// We separate persisted state from runtime state
interface PersistedState {
  libraryPath: LibraryPath | null;
  currentView: ViewMode;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      // Initial state
      db: null,
      isLoading: false,
      loadingProgress: 0,
      loadingMessage: '',
      error: null,
      loadedFromCache: false,
      dbSize: 0,
      lastSyncTime: null,
      libraryPath: null,
      currentView: 'grid',
      currentPage: 1,
      perPage: 20,
      searchTerm: '',

      setLibraryPath: (path) => {
        set({ libraryPath: createLibraryPath(path) });
      },

      loadDatabase: async (forceRefresh = false) => {
        const { libraryPath } = get();
        if (!libraryPath) {
          set({ error: 'Library path not configured' });
          return;
        }

        set({
          isLoading: true,
          loadingProgress: 10,
          loadingMessage: 'Initializing sql.js...',
          error: null,
          loadedFromCache: false,
        });

        try {
          // Initialize sql.js
          await initializeSqlJs();
          set({ loadingProgress: 30 });

          let dbData: Uint8Array | null = null;

          let syncTime: number | null = null;

          // Try to load from cache first (unless forcing refresh)
          if (!forceRefresh) {
            set({ loadingMessage: 'Checking cache...' });
            try {
              dbData = await loadFromCache(libraryPath);
              if (dbData) {
                syncTime = await getCacheTimestamp();
                set({
                  loadedFromCache: true,
                  loadingMessage: 'Loading from cache...',
                  loadingProgress: 70,
                });
              }
            } catch (cacheError) {
              errorService.logBackground(cacheError, 'cache-read');
              await clearCache();
              dbData = null;
            }
          }

          if (!dbData) {
            // Download from server
            offlineService.requireOnline(
              'You are offline and no cached database is available. Please connect to the internet and try again.'
            );

            set({
              loadingMessage: 'Downloading database from Dropbox...',
              loadingProgress: 40,
            });

            dbData = await downloadDatabase(libraryPath);

            set({ loadingProgress: 60, loadingMessage: 'Processing database...' });

            // Clear old cache and save new data (only after successful download)
            set({ loadingProgress: 80, loadingMessage: 'Caching for offline use...' });
            try {
              if (forceRefresh) {
                await clearCache();
              }
              await saveToCache(dbData, libraryPath);
              syncTime = Date.now();
            } catch (cacheError) {
              errorService.logBackground(cacheError, 'cache-save');
              syncTime = Date.now(); // Still track sync time even if caching fails
            }
          }

          set({ loadingProgress: 90, loadingMessage: 'Opening database...' });

          // Create database
          let db: SqlJsDatabase;
          try {
            db = createDatabase(dbData);
            if (!validateDatabase(db)) {
              throw new Error('Database validation failed');
            }
          } catch (dbError) {
            errorService.log(dbError, 'database-validation');
            if (get().loadedFromCache) {
              // Cache was corrupted, clear and retry
              await clearCache();
              set({ loadedFromCache: false });
              return get().loadDatabase(true);
            }
            throw new Error(
              'Downloaded database appears to be corrupted. Please try again.'
            );
          }

          queryService.setDatabase(db);
          set({
            db,
            dbSize: dbData.length,
            lastSyncTime: syncTime,
            isLoading: false,
            loadingProgress: 100,
            loadingMessage: '',
            currentPage: 1,
          });
        } catch (error) {
          errorService.log(error, 'load-database');
          const errorMessage = errorService.getMessage(error, 'Failed to load database');

          // Always clear loading state
          // IMPORTANT: Never reset db during refresh (forceRefresh=true) to prevent
          // the useEffect in App.tsx from re-triggering loadDatabase in a loop
          if (!forceRefresh) {
            queryService.setDatabase(null);
          }
          set({
            isLoading: false,
            loadingProgress: 0,
            loadingMessage: '',
            error: errorMessage,
            ...(forceRefresh ? {} : { db: null }),
          });
        }
      },

      refreshDatabase: async () => {
        if (!offlineService.isOnline) {
          set({
            error:
              'Cannot refresh while offline. Please connect to the internet and try again.',
          });
          return;
        }

        // Don't clear cache before download - loadDatabase will handle it on success
        await get().loadDatabase(true);
      },

      setView: (view) => {
        set({ currentView: view });
      },

      setSearchTerm: (term) => {
        set({ searchTerm: term, currentPage: 1 });
      },

      setPage: (page) => {
        set({ currentPage: page });
      },

      resetLibrary: async () => {
        await clearCache();
        queryService.setDatabase(null);
        set({
          db: null,
          libraryPath: null,
          error: null,
          currentPage: 1,
          searchTerm: '',
        });
      },

      setError: (error) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      cancelLoading: () => {
        set({
          isLoading: false,
          loadingProgress: 0,
          loadingMessage: '',
          error: 'Operation cancelled',
        });
      },
    }),
    {
      name: 'calibre-library-storage',
      partialize: (state): PersistedState => ({
        libraryPath: state.libraryPath,
        currentView: state.currentView,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<PersistedState> | undefined;
        return {
          ...currentState,
          currentView: persisted?.currentView ?? currentState.currentView,
          // Convert plain string from storage back to LibraryPath
          libraryPath: toLibraryPath(persisted?.libraryPath ?? null),
        };
      },
    }
  )
);

// Initialize errorService with the store's setError function
errorService.setErrorHandler((error: string) => {
  useLibraryStore.getState().setError(error);
});
