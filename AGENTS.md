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
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **State Management**: Zustand with persistence
- **Database**: sql.js (WASM SQLite), IndexedDB caching
- **Deployment**: Railway with nixpacks (Node.js + Python)

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

### CSS
- Tailwind CSS utility classes
- shadcn/ui components for consistent design
- Custom styles in `src/index.css`

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

### Adding a new component
1. Create component in appropriate `frontend/src/components/` subdirectory
2. Use shadcn/ui primitives where possible
3. Connect to Zustand store if needed
4. Add to parent component

### Environment variables
- `DROPBOX_ACCESS_TOKEN` - Required, Dropbox API token
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

Railway auto-builds using nixpacks:
1. Installs Node.js and Python
2. Runs `npm ci && npm run build` in frontend/
3. Installs Python dependencies
4. Starts gunicorn with `--timeout 120`

Required Railway settings:
- `DROPBOX_ACCESS_TOKEN` environment variable
- NIXPACKS builder (auto-detected)
