import logging
import os
from functools import wraps
from flask import Flask, request, jsonify, Response, send_from_directory
from dropbox_api import DropboxAPI, DropboxAuthError, normalize_library_path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger('cbdb')

# Serve React build from frontend/dist
# Note: We set static_folder=None to disable Flask's automatic static serving,
# which conflicts with our catch-all route for client-side routing.
# Static files are served manually in the catch_all() route.
STATIC_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend', 'dist')
app = Flask(__name__, static_folder=None)

# App password for authentication (REQUIRED for security)
APP_PASSWORD = os.getenv('APP_PASSWORD', '').strip()


def require_auth(f):
    """Decorator to require authentication for API endpoints."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not APP_PASSWORD:
            # No password configured - this is a server misconfiguration
            return jsonify({
                'success': False,
                'error': 'Server misconfigured: APP_PASSWORD environment variable is not set',
                'misconfigured': True
            }), 503

        # Check for password in header
        provided_password = request.headers.get('X-App-Password', '').strip()

        if not provided_password:
            return jsonify({
                'success': False,
                'error': 'Authentication required',
                'auth_required': True
            }), 401

        if provided_password != APP_PASSWORD:
            return jsonify({
                'success': False,
                'error': 'Invalid password',
                'auth_required': True
            }), 401

        return f(*args, **kwargs)
    return decorated


def get_library_path():
    """Get library path from request header."""
    return request.headers.get('X-Library-Path', '').strip()


def get_dropbox_api():
    """Get DropboxAPI instance. Returns (api, None) or (None, error_message)."""
    try:
        return DropboxAPI(), None
    except ValueError as e:
        return None, str(e)


@app.route('/health')
def health():
    """Health check endpoint."""
    return jsonify({'status': 'ok', 'static_folder': STATIC_FOLDER, 'exists': os.path.exists(STATIC_FOLDER)})


@app.route('/')
def index():
    """Serve the React app."""
    if not os.path.exists(STATIC_FOLDER):
        return jsonify({'error': 'Frontend not built', 'static_folder': STATIC_FOLDER}), 500
    return send_from_directory(STATIC_FOLDER, 'index.html')


@app.route('/<path:path>')
def catch_all(path):
    """
    Catch-all route to support client-side routing.
    Serves index.html for any non-API routes, allowing React Router to handle them.
    """
    # If it's an API route, return 404 (shouldn't reach here, but safety check)
    if path.startswith('api/'):
        return jsonify({'error': 'Not found'}), 404

    # Try to serve static file first (JS, CSS, images, etc.)
    static_file_path = os.path.join(STATIC_FOLDER, path)
    if os.path.isfile(static_file_path):
        return send_from_directory(STATIC_FOLDER, path)

    # For all other routes, serve index.html and let React Router handle it
    if not os.path.exists(STATIC_FOLDER):
        return jsonify({'error': 'Frontend not built', 'static_folder': STATIC_FOLDER}), 500
    return send_from_directory(STATIC_FOLDER, 'index.html')


@app.route('/api/auth-check')
def auth_check():
    """Check if authentication is required and validate provided password."""
    if not APP_PASSWORD:
        # Server is misconfigured - APP_PASSWORD must be set
        return jsonify({
            'misconfigured': True,
            'error': 'APP_PASSWORD environment variable is not set. The server administrator must configure a password.'
        }), 503

    provided_password = request.headers.get('X-App-Password', '').strip()
    if provided_password and provided_password == APP_PASSWORD:
        return jsonify({
            'auth_required': True,
            'authenticated': True
        })

    return jsonify({
        'auth_required': True,
        'authenticated': False
    })


@app.route('/api/config')
@require_auth
def api_config():
    """Return configuration status for the frontend."""
    api = get_dropbox_api()
    return jsonify({
        'token_configured': api is not None,
    })


@app.route('/api/validate-path', methods=['POST'])
@require_auth
def api_validate_path():
    """Validate a library path exists in Dropbox."""
    api, api_error = get_dropbox_api()
    if not api:
        return jsonify({
            'success': False,
            'error': api_error,
            'error_code': 'DROPBOX_AUTH_FAILED'
        }), 401

    data = request.json or {}
    library_path = data.get('library_path', '').strip()

    if not library_path:
        return jsonify({
            'success': False,
            'error': 'Library path is required'
        }), 400

    try:
        result = api.validate_library_path(library_path)

        if not result['valid']:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 400

        return jsonify({
            'success': True,
            'metadata_size': result.get('metadata_size'),
        })

    except DropboxAuthError as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'error_code': 'DROPBOX_AUTH_FAILED'
        }), 401

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/download-db')
@require_auth
def download_db():
    """
    Download metadata.db from Dropbox for browser-side SQLite.
    This proxies the download to keep the Dropbox token server-side.
    """
    api, api_error = get_dropbox_api()
    if not api:
        return jsonify({
            'success': False,
            'error': api_error,
            'error_code': 'DROPBOX_AUTH_FAILED'
        }), 401

    library_path = get_library_path()
    if not library_path:
        return jsonify({
            'success': False,
            'error': 'No library path provided. Set X-Library-Path header.'
        }), 400

    try:
        library_path = normalize_library_path(library_path)
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

    except DropboxAuthError as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'error_code': 'DROPBOX_AUTH_FAILED'
        }), 401

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/download-link')
@require_auth
def download_link():
    """
    Get a temporary download link for a book file.
    Returns a Dropbox temporary link that can be used for direct download.
    """
    api, api_error = get_dropbox_api()
    if not api:
        return jsonify({
            'success': False,
            'error': api_error,
            'error_code': 'DROPBOX_AUTH_FAILED'
        }), 401

    library_path = get_library_path()
    if not library_path:
        return jsonify({
            'success': False,
            'error': 'No library path provided. Set X-Library-Path header.'
        }), 400

    # Get file path from query parameter
    file_path = request.args.get('path', '').strip()
    if not file_path:
        return jsonify({
            'success': False,
            'error': 'No file path provided. Set path query parameter.'
        }), 400

    try:
        library_path = normalize_library_path(library_path)

        # Build full path: library_path + book_path + filename
        full_path = f"{library_path}/{file_path}"

        # Get temporary link from Dropbox
        link = api.get_temporary_link(full_path)

        return jsonify({
            'success': True,
            'link': link
        })

    except DropboxAuthError as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'error_code': 'DROPBOX_AUTH_FAILED'
        }), 401

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/book-content')
@require_auth
def book_content():
    """
    Download and proxy book file content (for epub.js reader).
    This is needed because Dropbox temporary links don't support CORS.
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

    # Get file path from query parameter
    file_path = request.args.get('path', '').strip()
    if not file_path:
        return jsonify({
            'success': False,
            'error': 'No file path provided. Set path query parameter.'
        }), 400

    try:
        library_path = normalize_library_path(library_path)
        full_path = f"{library_path}/{file_path}"

        logger.info(f"Downloading book content: {full_path}")

        # Download from Dropbox
        content = api.download_file(full_path)

        # Determine content type based on extension
        extension = file_path.lower().split('.')[-1] if '.' in file_path else ''
        content_types = {
            'epub': 'application/epub+zip',
            'pdf': 'application/pdf',
            'mobi': 'application/x-mobipocket-ebook',
            'azw3': 'application/x-mobipocket-ebook',
        }
        content_type = content_types.get(extension, 'application/octet-stream')

        # Return as binary response
        return Response(
            content,
            mimetype=content_type,
            headers={
                'Content-Length': len(content),
                'Cache-Control': 'private, max-age=3600'  # Cache for 1 hour
            }
        )

    except DropboxAuthError as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'error_code': 'DROPBOX_AUTH_FAILED'
        }), 401

    except Exception as e:
        logger.error(f"Book content download failed: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/covers', methods=['POST'])
@require_auth
def get_covers():
    """
    Get thumbnails for multiple book covers in one request.
    Accepts JSON body: { "paths": ["Author/Book (1)", ...] }
    Returns: { "covers": { "Author/Book (1)": "base64...", ... } }
    """
    api, api_error = get_dropbox_api()
    if not api:
        logger.error(f"Covers request failed: {api_error}")
        return jsonify({
            'success': False,
            'error': api_error,
            'error_code': 'DROPBOX_AUTH_FAILED'
        }), 401

    library_path = get_library_path()
    if not library_path:
        logger.warning("Covers request failed: No library path in header")
        return jsonify({
            'success': False,
            'error': 'No library path provided. Set X-Library-Path header.'
        }), 400

    data = request.json or {}
    book_paths = data.get('paths', [])

    if not book_paths:
        logger.debug("Covers request: empty paths list")
        return jsonify({'success': True, 'covers': {}})

    # Limit to 25 (Dropbox batch limit)
    original_count = len(book_paths)
    book_paths = book_paths[:25]

    logger.info(f"Covers request: {len(book_paths)} paths requested (of {original_count} total), library={library_path}")

    library_path = normalize_library_path(library_path)

    # Build full cover paths
    cover_paths = [
        f"{library_path}/{path}/cover.jpg"
        for path in book_paths
    ]

    try:
        results = api.get_thumbnails_batch(cover_paths, size="w128h128")

        # Map back to book paths
        covers = {}
        failed_paths = []
        for i, result in enumerate(results):
            if result["thumbnail"]:
                covers[book_paths[i]] = result["thumbnail"]
            elif result.get("error"):
                failed_paths.append((book_paths[i], result["error"]))

        logger.info(f"Covers result: {len(covers)} succeeded, {len(failed_paths)} failed")
        if failed_paths:
            # Log first few failures for debugging
            sample_failures = failed_paths[:3]
            logger.warning(f"Cover failures (sample): {sample_failures}")

        return jsonify({'success': True, 'covers': covers})

    except DropboxAuthError as e:
        logger.error(f"Covers request failed with auth error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'error_code': 'DROPBOX_AUTH_FAILED'
        }), 401

    except Exception as e:
        logger.error(f"Covers request failed with exception: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.getenv('FLASK_DEBUG', 'False') == 'True')
