import os
import requests
from datetime import datetime
from email.utils import parsedate_to_datetime


class DropboxSync:
    """Handle synchronization of Calibre database from Dropbox using shared links."""

    def __init__(self, shared_link):
        """
        Initialize Dropbox sync.

        Args:
            shared_link: Dropbox shared link URL to the folder containing metadata.db
                        Example: https://www.dropbox.com/sh/abc123xyz/...
        """
        if not shared_link:
            raise ValueError("DROPBOX_SHARED_LINK is required")

        self.shared_link = shared_link.rstrip('/')
        self.local_path = 'metadata.db'

    def _get_download_url(self):
        """Convert shared link to direct download URL for metadata.db."""
        # Add metadata.db to the path and force download
        if '?' in self.shared_link:
            return f"{self.shared_link}&dl=1&subpath=/metadata.db"
        else:
            return f"{self.shared_link}?dl=1&subpath=/metadata.db"

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
                raise Exception(
                    "Downloaded file does not appear to be a valid SQLite database. "
                    "Ensure the Dropbox shared link points to a folder containing metadata.db."
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
