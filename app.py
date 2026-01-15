import os
from flask import Flask, render_template, request, jsonify, Response
from db import CalibreDB
from dropbox_api import DropboxAPI

app = Flask(__name__)

# Database instance (always uses metadata.db)
calibre_db = CalibreDB('metadata.db')


def get_library_path():
    """Get library path from request header."""
    return request.headers.get('X-Library-Path', '').strip()


def get_dropbox_api():
    """Get DropboxAPI instance. Returns None if not configured."""
    try:
        return DropboxAPI()
    except ValueError:
        return None


def ensure_db_synced(library_path):
    """Sync database from Dropbox if needed."""
    if not library_path:
        return False

    api = get_dropbox_api()
    if not api:
        return False

    try:
        api.sync_metadata_db(library_path)
        return True
    except Exception as e:
        print(f"Warning: Could not sync database: {e}")
        return False


@app.route('/api/config')
def api_config():
    """Return configuration status for the frontend."""
    api = get_dropbox_api()
    return jsonify({
        'token_configured': api is not None,
    })


@app.route('/api/validate-path', methods=['POST'])
def api_validate_path():
    """Validate a library path and sync if valid."""
    api = get_dropbox_api()
    if not api:
        return jsonify({
            'success': False,
            'error': 'Dropbox access token not configured. Set DROPBOX_ACCESS_TOKEN environment variable.'
        }), 500

    data = request.json or {}
    library_path = data.get('library_path', '').strip()

    if not library_path:
        return jsonify({
            'success': False,
            'error': 'Library path is required'
        }), 400

    try:
        # Validate the path
        result = api.validate_library_path(library_path)

        if not result['valid']:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 400

        # Path is valid, sync the database
        api.sync_metadata_db(library_path)

        return jsonify({
            'success': True,
            'metadata_size': result.get('metadata_size'),
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/')
def index():
    """Display all books in the library."""
    library_path = get_library_path()

    # Check if database exists and is valid
    db_exists = os.path.exists('metadata.db') and os.path.getsize('metadata.db') > 0

    # If we have a library path, try to sync
    if library_path and get_dropbox_api():
        try:
            ensure_db_synced(library_path)
            db_exists = True
        except Exception as e:
            print(f"Sync error: {e}")

    # Render page - frontend will handle showing setup if needed
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '')

    if not db_exists:
        # Return empty page, frontend will show setup
        return render_template('index.html',
                             books=[],
                             page=1,
                             total_pages=0,
                             total=0,
                             search='',
                             needs_setup=True)

    try:
        if search:
            books, total = calibre_db.search_books(search, page, per_page)
        else:
            books, total = calibre_db.get_books(page, per_page)

        total_pages = (total + per_page - 1) // per_page

        return render_template('index.html',
                             books=books,
                             page=page,
                             total_pages=total_pages,
                             total=total,
                             search=search,
                             needs_setup=False)
    except Exception as e:
        print(f"Database error: {e}")
        return render_template('index.html',
                             books=[],
                             page=1,
                             total_pages=0,
                             total=0,
                             search='',
                             needs_setup=True)


@app.route('/book/<int:book_id>')
def book_detail(book_id):
    """Display detailed information about a specific book."""
    library_path = get_library_path()

    # Try to sync if we have a path
    if library_path:
        ensure_db_synced(library_path)

    book = calibre_db.get_book_detail(book_id)
    if not book:
        return "Book not found", 404

    return render_template('book_detail.html', book=book)


@app.route('/api/sync', methods=['POST'])
def sync():
    """Trigger a sync with Dropbox."""
    api = get_dropbox_api()
    if not api:
        return jsonify({
            'success': False,
            'error': 'Dropbox access token not configured'
        }), 500

    data = request.json or {}
    library_path = data.get('library_path') or get_library_path()

    if not library_path:
        return jsonify({
            'success': False,
            'error': 'No library path provided'
        }), 400

    try:
        result = api.sync_metadata_db(library_path)
        return jsonify({
            'success': True,
            'message': 'Database synced successfully',
            'size': result['size']
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/authors')
def authors():
    """Get list of all authors."""
    authors_list = calibre_db.get_authors()
    return jsonify(authors_list)


@app.route('/api/tags')
def tags():
    """Get list of all tags."""
    tags_list = calibre_db.get_tags()
    return jsonify(tags_list)


@app.route('/api/series')
def series():
    """Get list of all series."""
    series_list = calibre_db.get_series()
    return jsonify(series_list)


@app.route('/api/download-db')
def download_db():
    """
    Download metadata.db from Dropbox for browser-side SQLite.
    This proxies the download to keep the Dropbox token server-side.
    """
    api = get_dropbox_api()
    if not api:
        return jsonify({
            'success': False,
            'error': 'Dropbox access token not configured'
        }), 500

    library_path = get_library_path()
    if not library_path:
        return jsonify({
            'success': False,
            'error': 'No library path provided. Set X-Library-Path header.'
        }), 400

    try:
        # Normalize path
        if not library_path.startswith("/"):
            library_path = "/" + library_path
        library_path = library_path.rstrip("/")
        metadata_path = f"{library_path}/metadata.db"

        # Download from Dropbox
        content = api.download_file(metadata_path)

        # Validate SQLite header
        if not content.startswith(b"SQLite format 3\x00"):
            return jsonify({
                'success': False,
                'error': 'Downloaded file is not a valid SQLite database'
            }), 500

        # Return as binary response
        return Response(
            content,
            mimetype='application/x-sqlite3',
            headers={
                'Content-Disposition': 'attachment; filename=metadata.db',
                'Content-Length': len(content),
                'Cache-Control': 'no-cache'
            }
        )

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/wasm')
def wasm_browser():
    """Serve the WASM SQLite browser page."""
    return render_template('wasm.html')


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.getenv('FLASK_DEBUG', 'False') == 'True')
