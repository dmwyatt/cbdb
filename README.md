# Calibre Library Web App

A simple web app for browsing your Calibre book library from Dropbox using the Dropbox API.

## Features

- Browse your entire Calibre library
- Search books by title or author
- View detailed book information (authors, series, ratings, tags, formats, descriptions)
- Automatic sync with Dropbox using API access token
- Clean, responsive design that works on mobile

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

### Step 2: Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select this repository
5. In Railway dashboard → Variables → Add:
   - `DROPBOX_ACCESS_TOKEN` → Your Dropbox access token from Step 1
6. Railway builds and deploys automatically

### Step 3: First-Time Setup (In Browser)

1. Railway gives you a URL (like `your-app.railway.app`)
2. Visit that URL
3. You'll see a setup page asking for your Dropbox library path
4. Enter the path to your Calibre Library in Dropbox:
   - Example: `/Calibre Library` or `/Books/My Calibre Library`
   - This is the folder containing `metadata.db`
5. Click "Save and Continue"
6. Done! Your library is now accessible.

### That's It!

The app saves your library path in your browser's localStorage. You only need to set it up once per browser/device.

## How It Works

- **Environment Variable**: Your Dropbox access token is configured as an environment variable on the server
- **Frontend Storage**: Your Dropbox library path is stored in your browser's localStorage
- **On-Demand Sync**: When you visit the app, it downloads `metadata.db` from Dropbox via the API
- **Server-Side Caching**: The database is cached on the server (Railway's ephemeral storage)
- **Stateless**: Perfect for serverless/container deployments

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DROPBOX_ACCESS_TOKEN` | Yes | Dropbox API access token with `files.metadata.read` and `files.content.read` permissions |
| `FLASK_DEBUG` | No | Set to `True` for debug mode (default: `False`) |
| `PORT` | No | Server port (default: `5000`) |

## Local Development

```bash
# Clone and setup
git clone <your-repo>
cd cbdb
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file with your access token
cp .env.example .env
# Edit .env and add your DROPBOX_ACCESS_TOKEN

# Run
python app.py

# Visit http://localhost:5000
# You'll see the setup page - enter your Dropbox library path
```

## Project Structure

```
cbdb/
├── app.py                 # Main Flask application
├── db.py                  # Database query interface
├── dropbox_api.py         # Dropbox API integration
├── requirements.txt       # Python dependencies
├── Procfile              # Railway/Heroku process file
├── railway.json          # Railway configuration
├── runtime.txt           # Python version specification
├── .env.example          # Environment variable template
├── templates/            # HTML templates
│   ├── base.html
│   ├── index.html
│   └── book_detail.html
└── static/
    └── css/
        └── style.css     # Stylesheet
```

## How It Works

1. **Configure**: Set your Dropbox access token as an environment variable
2. **Setup**: Enter your Calibre library path in the browser on first visit
3. **Sync**: The app downloads `metadata.db` from your Dropbox via the API
4. **Query**: The app reads the SQLite database to fetch book information
5. **Display**: Books are displayed in a clean, paginated interface
6. **Search**: Full-text search across book titles and authors

## API Endpoints

- `GET /` - Main library view
- `GET /book/<id>` - Book detail page
- `GET /api/config` - Return token configuration status
- `POST /api/validate-path` - Validate library path and trigger sync
- `POST /api/sync` - Trigger database sync with Dropbox
- `GET /api/authors` - Get list of all authors (JSON)
- `GET /api/tags` - Get list of all tags (JSON)
- `GET /api/series` - Get list of all series (JSON)

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

- Click the "Change Library" button in the header
- Re-enter your library path to trigger a fresh download
- Or use the API: `POST /api/sync` with your library path in the request body

### "Dropbox access token not configured"

- Ensure `DROPBOX_ACCESS_TOKEN` is set in your environment variables
- On Railway: Check Variables in your project settings
- Locally: Check your `.env` file

## Security Notes

- Your Dropbox access token is stored securely on the server (not in the browser)
- Only the account owner with the access token can access the library
- Actual book files are NOT exposed (only metadata.db)
- The library path is stored in browser localStorage

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

See LICENSE file for details.

## Acknowledgments

- Built for [Calibre](https://calibre-ebook.com/) e-book management
- Uses the [Dropbox API](https://www.dropbox.com/developers)
- Designed for deployment on [Railway](https://railway.app)

## Sources

- [Calibre Database API Documentation](https://manual.calibre-ebook.com/db_api.html)
- [Calibre SQLite Schema](https://github.com/kovidgoyal/calibre/blob/master/resources/metadata_sqlite.sql)
