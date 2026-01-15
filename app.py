import os
from flask import Flask, render_template, request, jsonify, Response
from dropbox_api import DropboxAPI

app = Flask(__name__)


def get_library_path():
    """Get library path from request header."""
    return request.headers.get('X-Library-Path', '').strip()


def get_dropbox_api():
    """Get DropboxAPI instance. Returns None if not configured."""
    try:
        return DropboxAPI()
    except ValueError:
        return None


@app.route('/')
def index():
    """Serve the WASM SQLite browser."""
    return render_template('index.html')


@app.route('/api/config')
def api_config():
    """Return configuration status for the frontend."""
    api = get_dropbox_api()
    return jsonify({
        'token_configured': api is not None,
    })


@app.route('/api/validate-path', methods=['POST'])
def api_validate_path():
    """Validate a library path exists in Dropbox."""
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

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


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


@app.route('/api/download-link')
def download_link():
    """
    Get a temporary download link for a book file.
    Returns a Dropbox temporary link that can be used for direct download.
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
        # Normalize library path
        if not library_path.startswith("/"):
            library_path = "/" + library_path
        library_path = library_path.rstrip("/")

        # Build full path: library_path + book_path + filename
        full_path = f"{library_path}/{file_path}"

        # Get temporary link from Dropbox
        link = api.get_temporary_link(full_path)

        return jsonify({
            'success': True,
            'link': link
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.getenv('FLASK_DEBUG', 'False') == 'True')
