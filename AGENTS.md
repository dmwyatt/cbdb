# AGENTS.md

Calibre Library Web App - browser-based Calibre e-book library viewer using WASM SQLite.

## Quick Start

```bash
# Setup
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Then add DROPBOX_ACCESS_TOKEN

# Run development server
python app.py  # Serves on http://localhost:5000
```

## Project Structure

```
app.py              # Flask server - Dropbox proxy, API endpoints
dropbox_api.py      # Dropbox API client class
templates/index.html # Single-page app (HTML + JS + WASM SQLite)
static/css/style.css # Responsive styling
```

## Tech Stack

- **Backend**: Flask 3.0, Python 3.11
- **Frontend**: Vanilla JS, sql.js (WASM SQLite), IndexedDB caching
- **Deployment**: Railway with gunicorn (120s timeout for large DB downloads)

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/config` | GET | Check if Dropbox token is configured |
| `/api/validate-path` | POST | Verify library path exists in Dropbox |
| `/api/download-db` | GET | Download metadata.db (uses `X-Library-Path` header) |

## Code Style

### Python
- Functions: `snake_case`
- Classes: `PascalCase`
- Error messages should include troubleshooting steps
- Keep Flask routes in `app.py`, Dropbox logic in `dropbox_api.py`

### JavaScript
- Functions: `camelCase`
- Global state variables at top of script: `db`, `SQL`, `currentPage`
- Use DOM manipulation for HTML escaping: `element.textContent = text`
- SQL queries must use prepared statements with `?` placeholders

### CSS
- BEM-style naming: `.book-card`, `.book-info`, `.book-title`
- Primary color: `#3498db`, Header: `#2c3e50`
- Mobile-first responsive design

## Security Requirements

- **Never expose Dropbox token to frontend** - keep in environment variable
- **Always use parameterized SQL queries** - prevents injection
- **Escape HTML via textContent** - prevents XSS
- **Validate SQLite header bytes** on download - prevents corruption

## Testing

No automated test framework yet. Manual testing areas:

1. Setup flow (library path validation)
2. Database download and caching
3. Search functionality (title + author)
4. Pagination
5. Offline mode (cached database works without network)
6. Refresh functionality (re-downloads from Dropbox)

## Common Tasks

### Adding an API endpoint
1. Add route in `app.py` with `@app.route()`
2. Return JSON with `jsonify()`
3. Handle errors with appropriate HTTP status codes

### Modifying database queries
1. Update SQL in `index.html` JavaScript
2. Use `?` placeholders for parameters
3. Test query performance in browser DevTools

### Environment variables
- `DROPBOX_ACCESS_TOKEN` - Required, Dropbox API token
- `FLASK_DEBUG` - Optional, enables debug mode
- `PORT` - Optional, default 5000

## Architecture Notes

- Server proxies Dropbox API (keeps token secure)
- Database downloaded once, cached in IndexedDB
- All SQL queries run in browser via WASM (instant, offline-capable)
- No server-side query execution after initial download

## Git Workflow

- Feature branches: `claude/description-RANDOMID`
- Merge via pull requests
- Keep commits focused and descriptive

## Deployment

```bash
# Production (Railway uses this via Procfile)
gunicorn --timeout 120 app:app
```

Required Railway settings:
- `DROPBOX_ACCESS_TOKEN` environment variable
- NIXPACKS builder (auto-detected)
