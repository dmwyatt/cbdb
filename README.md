# Calibre Library Web App

A simple web app for browsing your Calibre book library from Dropbox. **Zero configuration required** - just deploy and use!

## Features

- 📚 Browse your entire Calibre library
- 🔍 Search books by title or author
- 📖 View detailed book information (authors, series, ratings, tags, formats, descriptions)
- ☁️ Automatic sync with Dropbox using shared links
- 📱 Clean, responsive design that works on mobile
- 🚀 Zero-config deployment - no environment variables needed!

## Ultra-Simple Setup (Perfect for Mobile!)

### Step 1: Deploy to Railway

**No configuration needed - just click deploy:**

1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select this repository
5. Railway builds and deploys automatically
6. **That's it!** No environment variables to configure.

### Step 2: First-Time Setup (In Browser)

1. Railway gives you a URL (like `your-app.railway.app`)
2. Visit that URL
3. You'll see a setup page asking for your Dropbox link
4. Get your Dropbox shared link:
   - Open Dropbox (app or web)
   - Find your Calibre Library folder (contains `metadata.db`)
   - Right-click → Share → Create link
   - Copy the link
5. Paste the link into the setup page
6. Click "Save and Continue"
7. Done! Your library is now accessible.

### That's It!

The app saves your Dropbox link in your browser's localStorage. You only need to set it up once per browser/device.

## How It Works

- **Frontend Storage**: Your Dropbox link is stored in your browser's localStorage
- **On-Demand Sync**: When you visit the app, it downloads `metadata.db` from Dropbox
- **Server-Side Caching**: The database is cached on the server (Railway's ephemeral storage)
- **No Database**: No persistent server-side database needed
- **Stateless**: Perfect for serverless/container deployments

## Optional: Pre-configure with Environment Variable

If you prefer to set the Dropbox link via environment variable (e.g., for multiple users or to skip setup):

In Railway dashboard → Variables → Add:
- `DROPBOX_SHARED_LINK` → Your Dropbox shared link

This will pre-sync the database on startup, but the web setup still works too.

## Local Development (Optional)

```bash
# Clone and setup
git clone <your-repo>
cd cbdb
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run (no .env needed!)
python app.py

# Visit http://localhost:5000
# You'll see the setup page - paste your Dropbox link there
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

### App shows setup page on every visit

- Check that your browser allows localStorage
- Try another browser
- Check browser privacy settings (localStorage might be blocked)

### "No books displayed" or "Downloaded file seems too small"

- Verify your Dropbox shared link is correct
- Make sure you shared the **folder** containing `metadata.db`, not the file itself
- The folder should be your Calibre Library root (contains `metadata.db` at the top level)
- Try visiting `/setup` to reconfigure your link

### Database not updating with new books

- Click the ⚙️ Settings link in the header
- Save your link again to trigger a fresh download
- Or use the API: `POST /api/sync` with your Dropbox link

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
