import base64
import io
import logging
import os

logger = logging.getLogger('cbdb.local_storage')


class LocalStorageAPI:
    """Local filesystem storage backend for testing without Dropbox."""

    def __init__(self, base_path=None):
        """
        Initialize local storage API.

        Args:
            base_path: Base directory for storage. If not provided, reads from
                      LOCAL_STORAGE_PATH environment variable. Defaults to './test_data'.
        """
        self.base_path = base_path or os.getenv('LOCAL_STORAGE_PATH', './test_data')
        self.base_path = os.path.abspath(self.base_path)

        if not os.path.exists(self.base_path):
            raise ValueError(
                f"Local storage path does not exist: {self.base_path}. "
                "Set LOCAL_STORAGE_PATH environment variable to a valid directory."
            )

    def _resolve_path(self, path: str) -> str:
        """
        Resolve a path safely within the base directory.

        Prevents directory traversal attacks.
        """
        # Normalize the path: remove leading slash, resolve relative components
        path = path.lstrip('/')
        full_path = os.path.normpath(os.path.join(self.base_path, path))

        # Ensure the resolved path is within base_path
        if not full_path.startswith(self.base_path):
            raise ValueError(f"Path traversal attempt detected: {path}")

        return full_path

    def validate_library_path(self, library_path: str) -> dict:
        """
        Validate that a path is a valid Calibre library (contains metadata.db).

        Args:
            library_path: Path to check (e.g., "/Calibre Library")

        Returns:
            dict with 'valid' bool and 'error' or 'metadata_size' on success
        """
        try:
            resolved_path = self._resolve_path(library_path)
            metadata_path = os.path.join(resolved_path, 'metadata.db')

            if not os.path.exists(resolved_path):
                return {
                    "valid": False,
                    "error": f"Library path not found: {library_path}"
                }

            if not os.path.exists(metadata_path):
                # Look for suggestions
                suggestions = []
                for entry in os.listdir(self.base_path):
                    entry_path = os.path.join(self.base_path, entry)
                    if os.path.isdir(entry_path):
                        if os.path.exists(os.path.join(entry_path, 'metadata.db')):
                            suggestions.append(f"/{entry}")

                error_msg = f"metadata.db not found at '{library_path}'"
                if suggestions:
                    error_msg += f"\n\nFound Calibre libraries at: {', '.join(suggestions)}"
                else:
                    error_msg += "\n\nMake sure the path points to your Calibre Library folder."

                return {"valid": False, "error": error_msg}

            size = os.path.getsize(metadata_path)
            mtime = os.path.getmtime(metadata_path)

            return {
                "valid": True,
                "metadata_size": size,
                "metadata_modified": mtime,
            }

        except ValueError as e:
            return {"valid": False, "error": str(e)}

    def download_file(self, path: str) -> bytes:
        """
        Read a file from local filesystem.

        Args:
            path: Path to file (e.g., "/Calibre Library/metadata.db")

        Returns:
            bytes: File content
        """
        resolved_path = self._resolve_path(path)

        if not os.path.exists(resolved_path):
            raise Exception(f"File not found: {path}")

        if not os.path.isfile(resolved_path):
            raise Exception(f"Path is not a file: {path}")

        with open(resolved_path, 'rb') as f:
            return f.read()

    def get_thumbnails_batch(self, paths: list, size: str = "w128h128", format: str = "jpeg") -> list:
        """
        Get thumbnails for multiple files.

        Args:
            paths: List of file paths (max 25)
            size: Thumbnail size (e.g., "w128h128")
            format: Output format (jpeg or png)

        Returns:
            List of {path, thumbnail (base64), error} dicts
        """
        try:
            from PIL import Image
        except ImportError:
            logger.warning("Pillow not installed, returning empty thumbnails")
            return [{"path": p, "thumbnail": None, "error": "pillow_not_installed"} for p in paths]

        if len(paths) > 25:
            raise ValueError("Maximum 25 thumbnails per batch")

        # Parse size string (e.g., "w128h128" -> width=128, height=128)
        width = 128
        height = 128
        if size.startswith('w') and 'h' in size:
            try:
                parts = size[1:].split('h')
                width = int(parts[0])
                height = int(parts[1])
            except (ValueError, IndexError):
                pass

        logger.info(f"Generating {len(paths)} thumbnails locally (size={width}x{height})")

        results = []
        for path in paths:
            try:
                resolved_path = self._resolve_path(path)

                if not os.path.exists(resolved_path):
                    results.append({"path": path, "thumbnail": None, "error": "path"})
                    continue

                # Open and resize image
                with Image.open(resolved_path) as img:
                    # Convert to RGB if necessary (for JPEG output)
                    if img.mode in ('RGBA', 'P') and format.lower() == 'jpeg':
                        img = img.convert('RGB')

                    # Resize maintaining aspect ratio
                    img.thumbnail((width, height), Image.Resampling.LANCZOS)

                    # Save to bytes
                    buffer = io.BytesIO()
                    img_format = 'JPEG' if format.lower() == 'jpeg' else 'PNG'
                    img.save(buffer, format=img_format, quality=85)
                    buffer.seek(0)

                    # Encode to base64
                    thumbnail_b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
                    results.append({"path": path, "thumbnail": thumbnail_b64, "error": None})

            except Exception as e:
                logger.warning(f"Failed to generate thumbnail for {path}: {e}")
                results.append({"path": path, "thumbnail": None, "error": "conversion_error"})

        success_count = sum(1 for r in results if r["thumbnail"])
        logger.info(f"Thumbnail results: {success_count} success, {len(results) - success_count} failed")

        return results

    def get_temporary_link(self, path: str) -> str:
        """
        Get a URL for downloading a file.

        In local mode, returns a URL to the /api/local-file endpoint.

        Args:
            path: Path to file in storage

        Returns:
            str: URL for downloading the file
        """
        # URL-encode the path for the query parameter
        from urllib.parse import quote
        encoded_path = quote(path, safe='')
        return f"/api/local-file?path={encoded_path}"
