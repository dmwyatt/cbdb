# AGENTS.md

Calibre Library Web App - browser-based Calibre e-book library viewer using WASM SQLite.

## Quick Start

```bash
# Backend setup
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Then add DROPBOX_ACCESS_TOKEN

# Frontend setup
cd frontend && npm install && cd ..

# Development (run in separate terminals)
python app.py              # Backend on http://localhost:5000
cd frontend && npm run dev # Frontend on http://localhost:5173

# Production build
cd frontend && npm run build
python app.py  # Serves React build from frontend/dist
```

## Project Structure

```
app.py                  # Flask server - Dropbox proxy, API endpoints, serves React build
dropbox_api.py          # Dropbox API client class
requirements.txt        # Python dependencies
Dockerfile              # Multi-stage build (Node.js + Python)
fly.toml                # Fly.io configuration
runtime.txt             # Python version specification
.env.example            # Environment variable template
frontend/               # React + TypeScript + Vite app
├── src/
│   ├── components/     # React components
│   │   ├── ui/         # shadcn/ui components
│   │   ├── layout/     # Header, Footer, StatusBar
│   │   ├── setup/      # SetupForm
│   │   ├── books/      # BookGrid, BookTable, BookModal, etc.
│   │   └── common/     # LoadingOverlay, StarRating
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities, API client, sql.js wrapper
│   ├── store/          # Zustand state management
│   └── types/          # TypeScript interfaces
├── package.json
└── vite.config.ts
```

## Tech Stack

- **Backend**: Flask 3.0, Python 3.11
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **State Management**: Zustand with persistence
- **Database**: sql.js (WASM SQLite), IndexedDB caching
- **Deployment**: Fly.io with Docker (Node.js + Python)

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/api/config` | GET | Check if Dropbox token is configured |
| `/api/validate-path` | POST | Verify library path exists in Dropbox |
| `/api/download-db` | GET | Download metadata.db (uses `X-Library-Path` header) |
| `/api/download-link` | GET | Get temporary download link for book file |
| `/api/covers` | POST | Get batch thumbnails for book covers |

## Code Style

### Python
- Functions: `snake_case`
- Classes: `PascalCase`
- Error messages should include troubleshooting steps
- Keep Flask routes in `app.py`, Dropbox logic in `dropbox_api.py`

### TypeScript/React
- Components: `PascalCase` (e.g., `BookCard.tsx`)
- Functions/hooks: `camelCase` (e.g., `useDebounce`)
- Types/interfaces in `src/types/`
- SQL queries must use prepared statements with `?` placeholders
- State management via Zustand store
- Error handling via `errorService` and `logger` (see below)

### CSS
- Tailwind CSS utility classes
- shadcn/ui components for consistent design
- Custom styles in `src/index.css`

### Error Handling

**Global Errors** (user-facing modal):
```typescript
import { showGlobalError } from '@/lib/errorService';

// Shows error in modal dialog, also logs to console
showGlobalError(error);
showGlobalError('Something went wrong');
```

**Structured Logging** (console only, for debugging):
```typescript
import { log, LogCategory } from '@/lib/logger';

// All logs prefixed with [cbdb] for easy filtering in devtools
log.debug(LogCategory.CACHE, 'Checking cache', { key });
log.info(LogCategory.DATABASE, 'Database loaded');
log.warn(LogCategory.COVER, 'Failed to fetch cover', error);
log.error(LogCategory.DATABASE, 'Validation failed', error);
```

**Available log categories:** `COVER`, `CACHE`, `QUERY`, `DATABASE`, `NETWORK`

New categories can be added to `LogCategory` in `logger.ts`, but avoid category explosion - too many categories defeats the purpose of filtering. Prefer reusing existing categories when reasonable.

**Utility:**
```typescript
import { getErrorMessage } from '@/lib/utils';

// Extract message from unknown error type
const message = getErrorMessage(error, 'fallback message');
```

**When to use:**
- `showGlobalError()`: User needs to know (download failed, offline, validation errors)
- `log.warn()`/`log.error()`: Debug logging (cover fetch, cache, query failures)

## Security Requirements

- **Never expose Dropbox token to frontend** - keep in environment variable
- **Always use parameterized SQL queries** - prevents injection
- **React handles HTML escaping** - prevents XSS
- **Validate SQLite header bytes** on download - prevents corruption

## Testing

No automated test framework yet. Manual testing areas:

1. Setup flow (library path validation)
2. Database download and caching
3. Search functionality (title + author)
4. Pagination
5. Offline mode (cached database works without network)
6. Refresh functionality (re-downloads from Dropbox)
7. Grid/Table view toggle
8. Book detail modal and downloads

## Common Tasks

### Adding an API endpoint
1. Add route in `app.py` with `@app.route()`
2. Return JSON with `jsonify()`
3. Handle errors with appropriate HTTP status codes
4. Add TypeScript types in `frontend/src/types/api.ts`
5. Add API function in `frontend/src/lib/api.ts`

### Modifying database queries
1. Update SQL in `frontend/src/lib/sql.ts`
2. Use `?` placeholders for parameters
3. Update TypeScript types in `frontend/src/types/book.ts`
4. Test query performance in browser DevTools

### Debugging SQL queries with Node.js
If SQL queries fail silently or return unexpected results, you can test them locally with the actual database:

1. Get a Dropbox share link to the metadata.db file from the user
2. Download the database and test with Node.js + sql.js:

```javascript
// test-query.js
const initSqlJs = require('sql.js');
const fs = require('fs');

async function test() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('metadata.db'));

  try {
    const result = db.exec(`YOUR QUERY HERE`);
    console.log(result);
  } catch (e) {
    console.error('Query error:', e.message);
  }
}
test();
```

3. Run: `npm install sql.js && node test-query.js`

This catches SQL syntax errors that may be silently caught in the browser. Remember to delete test files before committing.

### Adding a new component
1. Create component in appropriate `frontend/src/components/` subdirectory
2. Use shadcn/ui primitives where possible
3. Connect to Zustand store if needed
4. Add to parent component

### Environment variables
- `DROPBOX_ACCESS_TOKEN` - Required, Dropbox API token
- `APP_PASSWORD` - Required, password to protect access to the library
- `FLASK_DEBUG` - Optional, enables debug mode
- `PORT` - Optional, default 5000

## Documentation

README.md is user-facing documentation. AGENTS.md is for AI agents and developers working on the codebase.

### Keeping README.md Up to Date

Update `README.md` when changes affect end users:

**Update README.md when:**
- Adding new user-facing features
- Changing the setup or deployment process
- Modifying environment variables
- Altering the build process or development workflow

**What to update:**
- Features list
- Setup instructions
- Environment Variables table
- Local Development instructions
- Troubleshooting section (if relevant)

**Do not update README.md for:**
- API endpoint changes (internal implementation detail)
- Internal refactoring
- Bug fixes that don't affect usage
- Code style or dependency updates

### Keeping AGENTS.md Up to Date

Update `AGENTS.md` when changes affect how agents/developers work with the code:

**Update AGENTS.md when:**
- Adding, removing, or changing API endpoints
- Modifying project structure
- Changing code style conventions
- Adding new common tasks or workflows

**What to update:**
- API Endpoints table
- Project Structure tree
- Code Style guidelines
- Common Tasks section

## Architecture Notes

- Server proxies Dropbox API (keeps token secure)
- Database downloaded once, cached in IndexedDB
- All SQL queries run in browser via WASM (instant, offline-capable)
- No server-side query execution after initial download
- React app built and served by Flask in production
- Vite dev server proxies API calls during development

## Git Workflow

- Feature branches: `claude/description-RANDOMID`
- Merge via pull requests
- Keep commits focused and descriptive

## Deployment

Fly.io builds using the multi-stage Dockerfile:
1. Stage 1: Node.js builds frontend (`npm ci && npm run build`)
2. Stage 2: Python serves via gunicorn with `--timeout 120`

Required Fly.io setup:
- `fly secrets set DROPBOX_ACCESS_TOKEN=...`
- `fly secrets set APP_PASSWORD=...`
- `fly.toml` configuration (auto-generated by `fly launch`)
