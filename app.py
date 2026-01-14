import os
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from db import CalibreDB
from dropbox_sync import DropboxSync

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key-change-in-production')

# Initialize Dropbox sync
dropbox_sync = DropboxSync(
    shared_link=os.getenv('DROPBOX_SHARED_LINK')
)

# Initialize database
calibre_db = CalibreDB('metadata.db')


@app.route('/')
def index():
    """Display all books in the library."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '')

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


@app.route('/book/<int:book_id>')
def book_detail(book_id):
    """Display detailed information about a specific book."""
    book = calibre_db.get_book_detail(book_id)
    if not book:
        return "Book not found", 404

    return render_template('book_detail.html', book=book)


@app.route('/api/sync', methods=['POST'])
def sync():
    """Trigger a sync with Dropbox."""
    try:
        dropbox_sync.sync()
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


@app.before_request
def before_first_request():
    """Sync database on startup if needed."""
    if not os.path.exists('metadata.db') or os.path.getsize('metadata.db') == 0:
        try:
            dropbox_sync.sync()
        except Exception as e:
            app.logger.error(f"Failed to sync database on startup: {e}")


if __name__ == '__main__':
    # Sync database before starting
    try:
        dropbox_sync.sync()
    except Exception as e:
        print(f"Warning: Could not sync database: {e}")

    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.getenv('FLASK_DEBUG', 'False') == 'True')
