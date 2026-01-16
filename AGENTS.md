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
| `/api/config` | GET | Check if Dropbox token is configured |
| `/api/validate-path` | POST | Verify library path exists in Dropbox |
| `/api/download-db` | GET | Download metadata.db (uses `X-Library-Path` header) |
| `/api/download-link` | GET | Get temporary download link for book file |

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

### Keeping README.md Up to Date

Update `README.md` when making significant changes to the codebase. The README is user-facing documentation and should accurately reflect the current state of the project.

**Update README.md when:**
- Adding, removing, or changing API endpoints
- Modifying the project structure (new directories, renamed files)
- Changing the tech stack (new dependencies, frameworks, or tools)
- Altering the build process or development workflow
- Adding new features that users should know about
- Changing environment variables or configuration options

**What to update:**
- API Endpoints table
- Project Structure tree
- Tech Stack section
- Local Development instructions
- Environment Variables table
- Features list
- Troubleshooting section (if relevant)

**Do not update README.md for:**
- Internal refactoring that doesn't change external behavior
- Bug fixes that don't affect usage
- Minor dependency updates
- Code style changes

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
