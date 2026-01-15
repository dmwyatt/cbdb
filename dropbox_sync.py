import os
import requests
from datetime import datetime
from email.utils import parsedate_to_datetime


class DropboxSync:
    """Handle synchronization of Calibre database from Dropbox using shared links."""

    # ZIP file magic bytes (PK header)
    ZIP_SIGNATURE = b'PK\x03\x04'

    def __init__(self, shared_link):
        """
        Initialize Dropbox sync.

        Args:
            shared_link: Dropbox shared link URL to the metadata.db file directly
                        Example: https://www.dropbox.com/scl/fi/abc123xyz/metadata.db?...
        """
        if not shared_link:
            raise ValueError("DROPBOX_SHARED_LINK is required")

        self.shared_link = shared_link.rstrip('/')
        self.local_path = 'metadata.db'
        self._validate_url()

    def _validate_url(self):
        """Validate the Dropbox URL format and provide helpful error messages."""
        url = self.shared_link

        # Check for folder link formats (these won't work correctly)
        folder_patterns = ['/scl/fo/', '/sh/']
        for pattern in folder_patterns:
            if pattern in url:
                raise ValueError(
                    f"The Dropbox URL appears to be a folder link (contains '{pattern}'). "
                    "This will cause timeouts because Dropbox returns a ZIP of the entire folder.\n\n"
                    "Please provide a direct link to the metadata.db FILE instead:\n"
                    "1. Open your Dropbox folder in a browser\n"
                    "2. Click on 'metadata.db' to select it\n"
                    "3. Click Share → Copy link\n"
                    "4. The URL should contain '/scl/fi/' (file) not '/scl/fo/' (folder)"
                )

        # Check for expected file link format
        if 'dropbox.com' in url and '/scl/fi/' not in url:
            # It's a Dropbox URL but not in the expected format
            print(
                "Warning: Dropbox URL format not recognized. Expected '/scl/fi/' for file links. "
                "If downloads fail, ensure you're sharing the metadata.db file directly."
            )

    def _get_download_url(self):
        """Convert shared link to direct download URL."""
        # For direct file links, just ensure dl=1 for download mode
        url = self.shared_link

        # Replace dl=0 with dl=1 if present
        if 'dl=0' in url:
            url = url.replace('dl=0', 'dl=1')
        elif '?' in url and 'dl=' not in url:
            url = f"{url}&dl=1"
        elif '?' not in url:
            url = f"{url}?dl=1"

        return url

    def get_remote_last_modified(self):
        """
        Get the Last-Modified timestamp from Dropbox without downloading the file.

        Returns:
            datetime object or None if unable to determine
        """
        try:
            download_url = self._get_download_url()
            response = requests.head(download_url, timeout=10, allow_redirects=True)
            response.raise_for_status()

            last_modified_str = response.headers.get('Last-Modified')
            if last_modified_str:
                return parsedate_to_datetime(last_modified_str)
            return None
        except Exception as e:
            print(f"Warning: Could not get remote Last-Modified: {e}")
            return None

    def needs_sync(self):
        """
        Check if local database needs to be synced from Dropbox.

        Returns:
            True if sync is needed, False otherwise
        """
        # If local file doesn't exist, we need to sync
        if not os.path.exists(self.local_path):
            return True

        # If local file is empty, we need to sync
        if os.path.getsize(self.local_path) == 0:
            return True

        # Check if remote file is newer
        remote_modified = self.get_remote_last_modified()
        if remote_modified is None:
            # If we can't determine remote timestamp, assume we need to sync
            return True

        local_modified = datetime.fromtimestamp(os.path.getmtime(self.local_path))

        # Make remote_modified timezone-naive for comparison
        if remote_modified.tzinfo is not None:
            remote_modified = remote_modified.replace(tzinfo=None)

        return remote_modified > local_modified

    def sync(self):
        """Download the metadata.db file from Dropbox."""
        try:
            download_url = self._get_download_url()
            print(f"Syncing database from Dropbox shared link...")

            # Download file
            response = requests.get(download_url, timeout=60)
            response.raise_for_status()

            content = response.content

            # Validate downloaded content
            if len(content) < 100:
                raise Exception(
                    "Downloaded file is unexpectedly small and may be invalid. "
                    "Check your shared link and ensure metadata.db exists in the folder."
                )

            # Verify SQLite file header (magic bytes)
            if not content.startswith(b"SQLite format 3\x00"):
                # Check if it's a ZIP file (common mistake with folder links)
                if content.startswith(self.ZIP_SIGNATURE):
                    raise Exception(
                        "Downloaded file is a ZIP archive, not a SQLite database. "
                        "This usually means you provided a Dropbox FOLDER link instead of a FILE link.\n\n"
                        "Please share the metadata.db file directly:\n"
                        "1. Open your Dropbox folder in a browser\n"
                        "2. Click on 'metadata.db' to select it\n"
                        "3. Click Share → Copy link\n"
                        "4. Use that direct file link instead"
                    )
                raise Exception(
                    "Downloaded file does not appear to be a valid SQLite database. "
                    "Ensure the Dropbox shared link points directly to metadata.db file."
                )

            # Save to local file atomically: write to temp file, then rename
            temp_path = self.local_path + ".tmp"
            with open(temp_path, 'wb') as f:
                f.write(content)
                f.flush()
                os.fsync(f.fileno())

            os.replace(temp_path, self.local_path)

            file_size = len(content)
            print(f"Database synced successfully. Size: {file_size} bytes")
            return True

        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to download from Dropbox: {str(e)}")
        except Exception as e:
            raise Exception(f"Failed to sync database: {str(e)}")

    def get_file_info(self):
        """Get basic information about the synced database file."""
        try:
            if os.path.exists(self.local_path):
                size = os.path.getsize(self.local_path)
                modified = os.path.getmtime(self.local_path)
                return {
                    'name': 'metadata.db',
                    'size': size,
                    'modified': modified
                }
            else:
                return None
        except Exception as e:
            raise Exception(f"Failed to get file info: {str(e)}")
