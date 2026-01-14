import os
from flask import Flask, render_template, request, jsonify
from db import CalibreDB
from dropbox_sync import DropboxSync

app = Flask(__name__)

# Database instance (always uses metadata.db)
calibre_db = CalibreDB('metadata.db')

# Store Dropbox link in memory (for single-user deployment)
# In production on Railway, this works fine since it's stateless anyway
dropbox_link = os.getenv('DROPBOX_SHARED_LINK', None)


def ensure_db_synced():
    """Check if database needs syncing from Dropbox and sync if needed."""
    if not dropbox_link:
        return False

    try:
        sync_obj = DropboxSync(dropbox_link)
        if sync_obj.needs_sync():
            print("Database is outdated, syncing from Dropbox...")
            sync_obj.sync()
            return True
        else:
            print("Database is up to date, no sync needed")
            return False
    except Exception as e:
        print(f"Warning: Could not check/sync database: {e}")
        return False


@app.route('/setup')
def setup():
    """Show setup page for configuring Dropbox link."""
    return render_template('setup.html')


@app.route('/api/setup', methods=['POST'])
def api_setup():
    """Save Dropbox link and test connection."""
    global dropbox_link

    data = request.json
    link = data.get('dropbox_link', '').strip()

    if not link:
        return jsonify({'success': False, 'error': 'Dropbox link is required'}), 400

    try:
        # Test the link by attempting to sync
        sync = DropboxSync(link)
        sync.sync()

        # If successful, store the link
        dropbox_link = link

        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/')
def index():
    """Display all books in the library."""
    # Check if database exists
    if not os.path.exists('metadata.db') or os.path.getsize('metadata.db') == 0:
        # Redirect to setup if no database
        return render_template('setup.html')

    # Sync from Dropbox if needed
    ensure_db_synced()

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '')

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
                             search=search)
    except Exception as e:
        # If database query fails, show setup page
        return render_template('setup.html')


@app.route('/book/<int:book_id>')
def book_detail(book_id):
    """Display detailed information about a specific book."""
    # Sync from Dropbox if needed
    ensure_db_synced()

    book = calibre_db.get_book_detail(book_id)
    if not book:
        return "Book not found", 404

    return render_template('book_detail.html', book=book)


@app.route('/api/sync', methods=['POST'])
def sync():
    """Trigger a sync with Dropbox."""
    global dropbox_link

    # Accept link from request body or use stored link
    data = request.json or {}
    link = data.get('dropbox_link', dropbox_link)

    if not link:
        return jsonify({'success': False, 'error': 'No Dropbox link configured'}), 400

    try:
        sync_obj = DropboxSync(link)
        sync_obj.sync()

        # Update stored link if provided
        if data.get('dropbox_link'):
            dropbox_link = link

        return jsonify({'success': True, 'message': 'Database synced successfully'})
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


if __name__ == '__main__':
    # Sync database before starting if env var is set
    if dropbox_link:
        try:
            sync_obj = DropboxSync(dropbox_link)
            if sync_obj.needs_sync():
                sync_obj.sync()
                print("Database synced successfully on startup")
            else:
                print("Database is up to date on startup")
        except Exception as e:
            print(f"Warning: Could not sync database: {e}")
    else:
        print("No Dropbox link configured. Visit /setup to configure.")

    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.getenv('FLASK_DEBUG', 'False') == 'True')
