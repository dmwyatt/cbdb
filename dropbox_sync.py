import os
import requests


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

    def sync(self):
        """Download the metadata.db file from Dropbox."""
        try:
            download_url = self._get_download_url()
            print(f"Syncing database from Dropbox shared link...")

            # Download file
            response = requests.get(download_url, timeout=60)
            response.raise_for_status()

            # Check if we got actual data
            if len(response.content) < 1000:
                raise Exception("Downloaded file seems too small. Check your shared link and ensure metadata.db exists in the folder.")

            # Save to local file
            with open(self.local_path, 'wb') as f:
                f.write(response.content)

            file_size = len(response.content)
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
