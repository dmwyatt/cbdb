import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  initializeSqlJs,
  createDatabase,
  validateDatabase,
  type SqlJsDatabase,
} from '@/lib/sql';
import { downloadDatabase } from '@/lib/api';
import { saveToCache, loadFromCache, clearCache } from '@/lib/indexeddb';

export type ViewMode = 'grid' | 'table';

interface LibraryState {
  // Database state
  db: SqlJsDatabase | null;
  isLoading: boolean;
  loadingProgress: number;
  loadingMessage: string;
  error: string | null;
  loadedFromCache: boolean;
  dbSize: number;

  // Library configuration (persisted)
  libraryPath: string | null;

  // View state (persisted)
  currentView: ViewMode;
  currentPage: number;
  perPage: number;
  searchTerm: string;

  // Modal state
  selectedBookId: number | null;

  // Actions
  setLibraryPath: (path: string) => void;
  loadDatabase: (forceRefresh?: boolean) => Promise<void>;
  refreshDatabase: () => Promise<void>;
  setView: (view: ViewMode) => void;
  setSearchTerm: (term: string) => void;
  setPage: (page: number) => void;
  setSelectedBookId: (id: number | null) => void;
  resetLibrary: () => Promise<void>;
  clearError: () => void;
}

// We separate persisted state from runtime state
interface PersistedState {
  libraryPath: string | null;
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
      libraryPath: null,
      currentView: 'grid',
      currentPage: 1,
      perPage: 20,
      searchTerm: '',
      selectedBookId: null,

      setLibraryPath: (path) => {
        set({ libraryPath: path });
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

          // Try to load from cache first
          if (!forceRefresh) {
            set({ loadingMessage: 'Checking cache...' });
            try {
              dbData = await loadFromCache(libraryPath);
              if (dbData) {
                set({
                  loadedFromCache: true,
                  loadingMessage: 'Loading from cache...',
                  loadingProgress: 70,
                });
              }
            } catch (cacheError) {
              console.warn('Cache read failed, will download fresh:', cacheError);
              await clearCache();
              dbData = null;
            }
          }

          if (!dbData) {
            // Download from server
            if (!navigator.onLine) {
              throw new Error(
                'You are offline and no cached database is available. Please connect to the internet and try again.'
              );
            }

            set({
              loadingMessage: 'Downloading database from Dropbox...',
              loadingProgress: 40,
            });

            dbData = await downloadDatabase(libraryPath);

            set({ loadingProgress: 60, loadingMessage: 'Processing database...' });

            // Cache in IndexedDB
            set({ loadingProgress: 80, loadingMessage: 'Caching for offline use...' });
            try {
              await saveToCache(dbData, libraryPath);
            } catch (cacheError) {
              console.warn('Failed to cache database:', cacheError);
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
            console.error('Database appears corrupted:', dbError);
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

          set({
            db,
            dbSize: dbData.length,
            isLoading: false,
            loadingProgress: 100,
            loadingMessage: '',
            currentPage: 1,
          });
        } catch (error) {
          console.error('Failed to load database:', error);
          set({
            isLoading: false,
            loadingProgress: 0,
            loadingMessage: '',
            error: error instanceof Error ? error.message : 'Failed to load database',
            db: null,
          });
        }
      },

      refreshDatabase: async () => {
        if (!navigator.onLine) {
          set({
            error:
              'Cannot refresh while offline. Please connect to the internet and try again.',
          });
          return;
        }

        await clearCache();
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

      setSelectedBookId: (id) => {
        set({ selectedBookId: id });
      },

      resetLibrary: async () => {
        await clearCache();
        set({
          db: null,
          libraryPath: null,
          error: null,
          currentPage: 1,
          searchTerm: '',
          selectedBookId: null,
        });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'calibre-library-storage',
      partialize: (state): PersistedState => ({
        libraryPath: state.libraryPath,
        currentView: state.currentView,
      }),
    }
  )
);
