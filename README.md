# Calibre Library Web App

A browser-based Calibre e-book library viewer that runs SQLite queries directly in your browser using WebAssembly. Your library metadata is downloaded once from Dropbox and cached locally for instant, offline-capable browsing.

## Features

- Browse your Calibre library with grid or table view
- Instant search by title or author (runs locally via WASM)
- Filter by tags, series, publisher, format, or rating
- Sort by title, author, rating, date published, or date added
- View detailed book info with covers, descriptions, and metadata
- Download books directly from Dropbox
- Offline-capable after initial sync
- Password-protected access
- Responsive design for mobile and desktop

See [FEATURES.md](FEATURES.md) for a complete list of features.

## Tech Stack

- **Backend**: Flask 3.0, Python 3.11
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **State Management**: Zustand with persistence
- **Database**: sql.js (WASM SQLite) running in browser, IndexedDB caching
- **Deployment**: Fly.io with Docker (Node.js + Python)

## Setup

### Step 1: Create a Dropbox App

1. Go to [dropbox.com/developers/apps](https://www.dropbox.com/developers/apps)
2. Click "Create app"
3. Choose "Scoped access" and "Full Dropbox" (or "App folder" if preferred)
4. Name your app (e.g., "My Calibre Browser")
5. In the app settings, go to the "Permissions" tab and enable:
   - `files.metadata.read`
   - `files.content.read`
6. Click "Submit" to save permissions
7. Go to the "Settings" tab and click "Generate" under "Generated access token"
8. Copy the token

### Step 2: Deploy to Fly.io

1. Install the [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/)
2. Sign up and log in: `fly auth login`
3. Clone this repository and navigate to it
4. Launch the app: `fly launch`
5. Set your secrets:
   ```bash
   fly secrets set DROPBOX_ACCESS_TOKEN="your_token_here"
   fly secrets set APP_PASSWORD="your_password_here"
   ```
6. Deploy: `fly deploy`

### Step 3: First-Time Setup (In Browser)

1. Fly.io gives you a URL (like `your-app.fly.dev`)
2. Visit that URL
3. You'll see a setup page asking for your Dropbox library path
4. Enter the path to your Calibre Library in Dropbox:
   - Example: `/Calibre Library` or `/Books/My Calibre Library`
   - This is the folder containing `metadata.db`
5. Click "Save and Continue"
6. Done! Your library is now accessible.

The app saves your library path in your browser's localStorage. You only need to set it up once per browser/device.

## How It Works

1. **Server Proxy**: Flask backend proxies Dropbox API calls (keeps token secure)
2. **Database Download**: On first load, `metadata.db` is downloaded from Dropbox
3. **Browser Caching**: Database is cached in IndexedDB for offline access
4. **WASM SQLite**: All queries run in-browser via sql.js (instant, no server round-trips)
5. **Cover Thumbnails**: Book covers fetched via Dropbox batch thumbnail API
6. **Direct Downloads**: Book files downloaded via temporary Dropbox links

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DROPBOX_ACCESS_TOKEN` | Yes | Dropbox API access token with `files.metadata.read` and `files.content.read` permissions |
| `APP_PASSWORD` | Yes | Password to protect access to the library |
| `FLASK_DEBUG` | No | Set to `True` for debug mode (default: `False`) |
| `PORT` | No | Server port (default: `5000`) |

## Local Development

```bash
# Clone and setup backend
git clone <your-repo>
cd cbdb
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file with your access token
cp .env.example .env
# Edit .env and add your DROPBOX_ACCESS_TOKEN

# Setup frontend
cd frontend
npm install
cd ..

# Run development servers (in separate terminals)
python app.py              # Backend on http://localhost:5000
cd frontend && npm run dev # Frontend on http://localhost:5173

# Or build for production
cd frontend && npm run build
python app.py  # Serves React build from frontend/dist at http://localhost:5000
```

## Project Structure

```
cbdb/
├── app.py                 # Flask server - API endpoints, serves React build
├── dropbox_api.py         # Dropbox API client class
├── requirements.txt       # Python dependencies
├── Dockerfile             # Multi-stage build (Node.js + Python)
├── fly.toml               # Fly.io configuration
├── runtime.txt            # Python version specification
├── .env.example           # Environment variable template
└── frontend/              # React + TypeScript + Vite app
    ├── src/
    │   ├── App.tsx        # Main React component
    │   ├── components/    # React components
    │   │   ├── ui/        # shadcn/ui primitives
    │   │   ├── layout/    # Header, Footer, StatusBar
    │   │   ├── setup/     # SetupForm
    │   │   ├── books/     # BookGrid, BookTable, BookModal, etc.
    │   │   └── common/    # LoadingOverlay, StarRating
    │   ├── hooks/         # Custom React hooks
    │   ├── lib/           # Utilities, API client, sql.js wrapper
    │   ├── store/         # Zustand state management
    │   └── types/         # TypeScript interfaces
    ├── package.json
    └── vite.config.ts
```

## Troubleshooting

### App shows setup page on every visit

- Check that your browser allows localStorage
- Try another browser
- Check browser privacy settings (localStorage might be blocked)

### "No books displayed" or "metadata.db not found"

- Verify your Dropbox library path is correct (e.g., `/Calibre Library`)
- Make sure the path points to the folder containing `metadata.db`
- Check that your Dropbox access token has the correct permissions
- Try re-entering your library path on the setup page

### Database not updating with new books

- Click the "Refresh" button in the header to re-download from Dropbox
- This clears the IndexedDB cache and fetches fresh data

### "Dropbox access token not configured"

- Ensure `DROPBOX_ACCESS_TOKEN` is set in your environment variables
- On Fly.io: Run `fly secrets list` to verify, or `fly secrets set` to update
- Locally: Check your `.env` file

## Security Notes

- **Password protection**: `APP_PASSWORD` environment variable is required for all deployments
- Your Dropbox access token is stored securely on the server (never sent to browser)
- All SQL queries use parameterized statements (prevents injection)
- React handles HTML escaping (prevents XSS)
- SQLite header bytes are validated on download (prevents corruption)
- Login form is compatible with password managers (1Password, Bitwarden, etc.)

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

See LICENSE file for details.

## Acknowledgments

- Built for [Calibre](https://calibre-ebook.com/) e-book management
- Uses the [Dropbox API](https://www.dropbox.com/developers)
- Designed for deployment on [Fly.io](https://fly.io)
- Browser SQLite powered by [sql.js](https://sql.js.org/)

## Sources

- [Calibre Database API Documentation](https://manual.calibre-ebook.com/db_api.html)
- [Calibre SQLite Schema](https://github.com/kovidgoyal/calibre/blob/master/resources/metadata_sqlite.sql)
