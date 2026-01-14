# Calibre Library Web App

A simple, elegant web application for browsing your Calibre book library stored on Dropbox. Built with Flask and designed for easy deployment on Railway.

## Features

- Browse your entire Calibre library
- Search books by title or author
- View detailed book information including:
  - Authors, series, publishers
  - Ratings and tags
  - Available formats
  - Book descriptions
  - Identifiers (ISBN, etc.)
- Automatic synchronization with Dropbox
- Clean, responsive design
- Pagination for large libraries

## Prerequisites

- A Calibre library stored on Dropbox
- A Dropbox access token
- Python 3.11+ (for local development)
- Railway account (for deployment)

## Setup

### 1. Get Dropbox Access Token

1. Go to [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Click "Create app"
3. Choose "Scoped access"
4. Choose "Full Dropbox" or "App folder" (depending on your preference)
5. Name your app
6. Once created, go to the "Permissions" tab and enable:
   - `files.metadata.read`
   - `files.content.read`
7. Go to the "Settings" tab
8. Under "Generated access token", click "Generate" to create an access token
9. Copy this token - you'll need it for configuration

### 2. Find Your Calibre Library Path

Your Calibre library path in Dropbox should point to the `metadata.db` file. For example:
- If your library is at the root: `/Calibre Library/metadata.db`
- If it's in a subfolder: `/Books/Calibre Library/metadata.db`

### 3. Local Development

1. Clone this repository:
```bash
git clone <your-repo-url>
cd cbdb
```

2. Create a virtual environment and install dependencies:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Edit `.env` with your credentials:
```env
DROPBOX_ACCESS_TOKEN=your_actual_dropbox_token_here
DROPBOX_METADATA_PATH=/Calibre Library/metadata.db
FLASK_SECRET_KEY=your_secret_key_here
```

5. Run the application:
```bash
python app.py
```

6. Open your browser to `http://localhost:5000`

## Deploying to Railway

Railway makes deployment incredibly simple:

### Option 1: Deploy from GitHub

1. Push your code to GitHub (if not already done)
2. Go to [Railway](https://railway.app)
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Select your repository
6. Railway will automatically detect the configuration

### Option 2: Deploy with Railway CLI

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login to Railway:
```bash
railway login
```

3. Initialize and deploy:
```bash
railway init
railway up
```

### Configure Environment Variables

In Railway dashboard:

1. Go to your project
2. Click on "Variables"
3. Add the following variables:
   - `DROPBOX_ACCESS_TOKEN`: Your Dropbox access token
   - `DROPBOX_METADATA_PATH`: Path to your metadata.db in Dropbox (e.g., `/Calibre Library/metadata.db`)
   - `FLASK_SECRET_KEY`: A random secret key (generate with `python -c "import secrets; print(secrets.token_hex(32))"`)

4. Railway will automatically redeploy with the new variables

### Access Your App

Once deployed, Railway will provide you with a URL like `your-app.railway.app`. Visit this URL to access your Calibre library!

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

### "File not found in Dropbox"

- Verify your `DROPBOX_METADATA_PATH` is correct
- Make sure the path starts with `/`
- Check that your Dropbox token has the correct permissions

### "No books displayed"

- Ensure the metadata.db file was successfully downloaded
- Check Railway logs: `railway logs`
- Verify your Calibre library has books in it

### Database not updating

- Trigger a manual sync by calling `POST /api/sync`
- Check that your Dropbox token is still valid
- Restart the Railway service

## Security Notes

- Never commit your `.env` file or expose your Dropbox token
- Use a strong `FLASK_SECRET_KEY` in production
- The app only has read access to your Dropbox
- No authentication is built-in - add your own if needed for public deployment

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
