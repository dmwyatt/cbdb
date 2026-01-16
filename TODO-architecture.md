# Architecture Improvements

Tracked improvements to establish clearer boundaries between layers and components.

## Priority 1: Critical

### Extract DatabaseService from `libraryStore.loadDatabase()`

**File**: `frontend/src/store/libraryStore.ts`

The `loadDatabase()` method is 116 lines mixing 6+ concerns:
- State management
- SQL.js initialization
- Cache orchestration
- API coordination
- Validation logic
- Error recovery with retry

**Solution**: Extract into separate services:
- `DatabaseInitializer` - SQL.js setup
- `CacheManager` - cache operations
- `DatabaseValidator` - validation logic

Keep `loadDatabase()` as a thin orchestrator that delegates to these services.

---

## Priority 2: Design Issues

### Hide store internals behind action methods

**Files**: Multiple components directly access store fields

Current pattern (tight coupling):
```typescript
const { db, searchTerm, setSearchTerm, resetLibrary } = useLibraryStore();
```

Components depend on store shape. If store structure changes, all components break.

**Solution**: Expose query methods instead of fields:
```typescript
// Instead of exposing `db` field
useLibraryStore.getState().executeQuery(...)

// Instead of exposing `searchTerm` + `setSearchTerm`
const searchTerm = useLibraryStore(state => state.searchTerm);
const updateSearch = useLibraryStore(state => state.actions.updateSearch);
```

Consider splitting into multiple stores or using selectors.

---

### Unify error handling patterns

**Files**: Throughout frontend

Current inconsistency:
- `SetupForm`: calls `store.setError()`
- `DownloadButton`: catches and calls `store.setError()`
- `BookModal`: silently swallows cover fetch errors
- Various: `console.error()` only

**Solution**:
1. Create error handling strategy (which errors show to users vs log only)
2. Create `ErrorService` or use React Error Boundary
3. Document pattern in AGENTS.md

---

## Priority 3: Code Quality

### Create OfflineService for network status

**Files**: Multiple `navigator.onLine` checks scattered

**Solution**: Create service that:
- Tracks online/offline status
- Emits events on status change
- Provides consistent offline handling

---

### Add type safety for library path

**Files**: Throughout - `libraryPath` is a plain string everywhere

**Solution**: Consider branded type or wrapper:
```typescript
type LibraryPath = string & { readonly brand: unique symbol };
function createLibraryPath(path: string): LibraryPath;
```

Low priority - current approach works, just less type-safe.

---

### Consolidate pagination logic

**Files**: `libraryStore.ts`, `Library.tsx`, `lib/sql.ts`

Pagination spread across:
- Store: `currentPage`, `perPage`
- Component: `totalPages` calculation
- SQL: pagination in query

**Solution**: Create pagination utility or keep in one place.

---

## Completed

### Create QueryService for database queries

**Files**: `frontend/src/components/books/Library.tsx`, `frontend/src/components/books/BookModal.tsx`

Created `frontend/src/lib/queryService.ts` with a singleton `QueryService` class that:
- Provides `getBooks()`, `searchBooks()`, `getBookDetail()`, and `queryBooks()` methods
- Encapsulates timing/metrics collection (returns `queryTime` with every result)
- Handles errors consistently with fallback to empty results
- Is the single source of truth for database queries

Updated `libraryStore.ts` to set the database on `queryService` when loaded/reset.
Updated `Library.tsx` and `BookModal.tsx` to use the service instead of direct SQL calls with inline timing.

---

### Create unified CoverService

**Files**: `frontend/src/hooks/useCovers.ts`, `frontend/src/components/books/BookModal.tsx`

Created `frontend/src/lib/coverService.ts` with a singleton `CoverService` class that:
- Provides `getCovers(paths: string[])` and `getCover(path: string)` methods
- Handles caching internally via IndexedDB
- Batches requests automatically (25 items per batch)
- Tracks pending fetches to prevent duplicate requests
- Is the single source of truth for cover logic

Updated `useCovers.ts` and `BookModal.tsx` to use the service instead of duplicating cache/fetch logic.

---

### Extract path normalization utility

**Files**: `app.py` (3 places), `dropbox_api.py` (2 places)

Added `normalize_library_path()` function to `dropbox_api.py` and replaced all 5 instances of duplicated normalization logic with calls to this function.

---

## Notes

- Backend architecture (app.py ↔ dropbox_api.py) is already well-separated
- Frontend folder structure is good; issues are in data flow and responsibilities
- AGENTS.md covers practical development tasks well
- This document tracks structural improvements, not feature work
