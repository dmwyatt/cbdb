# Calibre Library Web App

A simple web app for browsing your Calibre book library from Dropbox. Designed for ultra-easy deployment on Railway.

## Features

- Browse your entire Calibre library
- Search books by title or author
- View detailed book information (authors, series, ratings, tags, formats, descriptions)
- Automatic sync with Dropbox
- Clean, responsive design
- No authentication required!

## Super Simple Setup

### Step 1: Share Your Calibre Library on Dropbox

1. Open Dropbox (app or web)
2. Find your Calibre Library folder (the one with `metadata.db` inside)
3. Right-click → Share → Create link
4. Copy the link (looks like `https://www.dropbox.com/sh/abc123xyz/...`)
5. That's it!

### Step 2: Deploy to Railway

**From Mobile or Desktop:**

1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select this repository
5. Railway will start building automatically

### Step 3: Add Your Dropbox Link

In Railway dashboard:

1. Click on your project
2. Go to "Variables" tab
3. Add these two variables:
   - `DROPBOX_SHARED_LINK` → Paste your Dropbox link from Step 1
   - `FLASK_SECRET_KEY` → Any random text (e.g., `my-secret-key-123`)
4. Railway will automatically redeploy

### Step 4: Done!

Railway gives you a URL (like `your-app.railway.app`). Visit it to see your library!

## Local Development (Optional)

```bash
# Clone and setup
git clone <your-repo>
cd cbdb
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env and add your DROPBOX_SHARED_LINK

# Run
python app.py
# Visit http://localhost:5000
```

## Project Structure

```
cbdb/
├── app.py                 # Main Flask application
├── db.py                  # Database query interface
├── dropbox_sync.py        # Dropbox synchronization
├── requirements.txt       # Python dependencies
├── Procfile              # Railway/Heroku process file
├── railway.json          # Railway configuration
├── runtime.txt           # Python version specification
├── templates/            # HTML templates
│   ├── base.html
│   ├── index.html
│   └── book_detail.html
└── static/
    └── css/
        └── style.css     # Stylesheet
```

## How It Works

1. **Sync**: On startup, the app downloads `metadata.db` from your Dropbox
2. **Query**: The app reads the SQLite database to fetch book information
3. **Display**: Books are displayed in a clean, paginated interface
4. **Search**: Full-text search across book titles and authors
5. **Auto-sync**: The database can be manually re-synced via the API endpoint

## API Endpoints

- `GET /` - Main library view
- `GET /book/<id>` - Book detail page
- `POST /api/sync` - Trigger database sync with Dropbox
- `GET /api/authors` - Get list of all authors (JSON)
- `GET /api/tags` - Get list of all tags (JSON)
- `GET /api/series` - Get list of all series (JSON)

## Troubleshooting

### "No books displayed"

- Check your Dropbox shared link is correct
- Make sure `metadata.db` is in the shared folder
- Check Railway logs for errors
- Try triggering a manual sync: `POST /api/sync`

### "Downloaded file seems too small"

- Ensure you shared the Calibre Library folder (containing `metadata.db`)
- The shared link should end with the folder name, not a specific file

## Security Notes

- The shared link makes your book metadata publicly accessible
- Anyone with the link can see your book titles/authors
- Actual book files are NOT exposed (only metadata.db)
- Consider this acceptable for personal use
- Don't commit your `.env` file

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
